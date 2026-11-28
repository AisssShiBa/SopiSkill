import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
    authLoginResponseSchema,
    errorResponseSchema,
} from "@sopiskill/shared";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const testEmails = new Set<string>();

function testEmail(prefix: string): string {
    const email = `${prefix}-${randomUUID()}@sopiskill.test`;
    testEmails.add(email);
    return email;
}

async function register(email: string, password: string) {
    const res = await request(app).post("/api/v1/auth/register").send({ email, password });
    expect(res.status).toBe(201);
    return res.body.data.user;
}

async function cleanupAuthTests(): Promise<void> {
    if (testEmails.size === 0) return;
    await prisma.user.deleteMany({ where: { email: { in: [...testEmails] } } });
    testEmails.clear();
}

afterEach(cleanupAuthTests);
afterAll(async () => {
    await cleanupAuthTests();
    await prisma.$disconnect();
});

describe("AUTH-02 login", () => {
    it("logs in, signs a valid 900-second HS256 token, and accepts it on courses", async () => {
        const email = testEmail("login");
        const password = "ValidPassword123!";
        const user = await register(email, password);

        const res = await request(app).post("/api/v1/auth/login").send({ email, password });
        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]).toBeUndefined();
        const parsed = authLoginResponseSchema.parse(res.body);
        expect(parsed.data.tokenType).toBe("Bearer");
        expect(parsed.data.expiresIn).toBe(900);
        expect(parsed.data.user.id).toBe(user.id);
        expect(JSON.stringify(res.body)).not.toMatch(/refreshToken|passwordHash|password/i);

        const payload = jwt.verify(
            parsed.data.accessToken,
            process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET!,
            { algorithms: ["HS256"] },
        ) as jwt.JwtPayload;
        expect(payload.sub).toBe(user.id);
        expect(payload.exp! - payload.iat!).toBe(900);

        const courseRes = await request(app)
            .get("/api/v1/courses")
            .set("Authorization", `Bearer ${parsed.data.accessToken}`);
        expect(courseRes.status).toBe(200);
    });

    it("normalizes email and returns identical errors for unknown email and wrong password", async () => {
        const email = testEmail("normal-login");
        await register(email, "ValidPassword123!");

        const normalized = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: `  ${email.toUpperCase()}  `, password: "ValidPassword123!" });
        expect(normalized.status).toBe(200);

        const wrongPassword = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: "WrongPassword123!" });
        const unknownEmail = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testEmail("missing"), password: "WrongPassword123!" });

        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(errorResponseSchema.parse(wrongPassword.body).error.code).toBe("INVALID_CREDENTIALS");
        expect(errorResponseSchema.parse(unknownEmail.body).error.code).toBe("INVALID_CREDENTIALS");
        const stripRequestId = (body: unknown) =>
            JSON.parse(JSON.stringify(body).replace(/"requestId":"[^"]+"/g, '"requestId":"<id>"'));
        expect(stripRequestId(wrongPassword.body)).toEqual(stripRequestId(unknownEmail.body));
    });

    it("rejects invalid payloads and malformed JSON", async () => {
        const badPayloads = [
            {},
            { email: testEmail("missing-password") },
            { password: "ValidPassword123!" },
            { email: "invalid", password: "ValidPassword123!" },
            { email: testEmail("short"), password: "" },
            { email: testEmail("long"), password: "界".repeat(25) },
            { email: testEmail("extra"), password: "ValidPassword123!", role: "admin" },
        ];
        for (const payload of badPayloads) {
            const res = await request(app).post("/api/v1/auth/login").send(payload);
            expect(res.status).toBe(400);
            expect(errorResponseSchema.parse(res.body).error.code).toBe("INVALID_INPUT");
        }

        const malformed = await request(app)
            .post("/api/v1/auth/login")
            .set("Content-Type", "application/json")
            .send('{"email":');
        expect(malformed.status).toBe(400);
        expect(errorResponseSchema.parse(malformed.body).error.code).toBe("INVALID_INPUT");
    });

    it("isolates courses by token subject", async () => {
        const password = "ValidPassword123!";
        const emailA = testEmail("iso-a");
        const emailB = testEmail("iso-b");
        await register(emailA, password);
        await register(emailB, password);

        const loginA = await request(app).post("/api/v1/auth/login").send({ email: emailA, password });
        const loginB = await request(app).post("/api/v1/auth/login").send({ email: emailB, password });
        const tokenA = loginA.body.data.accessToken;
        const tokenB = loginB.body.data.accessToken;

        const userA = await prisma.user.findUnique({ where: { email: emailA } });
        await prisma.course.create({ data: { ownerId: userA!.id, title: "Private A", status: "draft" } });

        const asA = await request(app).get("/api/v1/courses").set("Authorization", `Bearer ${tokenA}`);
        const asB = await request(app).get("/api/v1/courses").set("Authorization", `Bearer ${tokenB}`);
        expect(asA.status).toBe(200);
        expect(asB.status).toBe(200);
        expect(asA.body.data).toHaveLength(1);
        expect(asB.body.data).toHaveLength(0);
    });

    it("rejects modified, wrong-secret, and expired tokens", async () => {
        const email = testEmail("token");
        await register(email, "ValidPassword123!");
        const login = await request(app).post("/api/v1/auth/login").send({
            email,
            password: "ValidPassword123!",
        });
        const token = login.body.data.accessToken as string;

        const expiredToken = jwt.sign(
            { sub: randomUUID() },
            process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET!,
            { algorithm: "HS256", expiresIn: -10 },
        );
        const wrongSecretToken = jwt.sign(
            { sub: randomUUID() },
            "wrong-secret-key-at-least-32-chars",
            { algorithm: "HS256", expiresIn: 900 },
        );
        for (const badToken of [
            `${token.slice(0, -1)}x`,
            wrongSecretToken,
            expiredToken,
        ]) {
            const res = await request(app).get("/api/v1/courses").set("Authorization", `Bearer ${badToken}`);
            expect(res.status).toBe(401);
            expect(errorResponseSchema.parse(res.body).error.code).toBe("UNAUTHORIZED");
        }
    });

    it("returns 500 without leaking details when JWT secret is missing", async () => {
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const jwtSecret = process.env.JWT_SECRET;
        const email = testEmail("missing-secret");
        await register(email, "ValidPassword123!");
        delete process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_SECRET;
        try {
            const res = await request(app).post("/api/v1/auth/login").send({
                email,
                password: "ValidPassword123!",
            });
            expect(res.status).toBe(500);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INTERNAL_ERROR");
            expect(JSON.stringify(res.body)).not.toMatch(/secret|token|stack|SQL/i);
        } finally {
            if (accessSecret !== undefined) process.env.JWT_ACCESS_SECRET = accessSecret;
            if (jwtSecret !== undefined) process.env.JWT_SECRET = jwtSecret;
        }
    });
});
