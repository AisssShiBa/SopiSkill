import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
    authRegisterResponseSchema,
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

describe("AUTH-01 register", () => {
    it("registers a valid user and stores a bcrypt password hash", async () => {
        const email = testEmail("register");
        const password = "ValidPassword123!";
        const res = await request(app).post("/api/v1/auth/register").send({ email, password });

        expect(res.status).toBe(201);
        expect(res.headers["set-cookie"]).toBeUndefined();
        const parsed = authRegisterResponseSchema.parse(res.body);
        expect(parsed.data.user.email).toBe(email);
        expect(parsed.data.user.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(JSON.stringify(res.body)).not.toContain("passwordHash");
        expect(JSON.stringify(res.body)).not.toContain("password");

        const stored = await prisma.user.findUnique({ where: { email } });
        expect(stored).not.toBeNull();
        expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
        expect(stored?.passwordHash).not.toBe(password);
        expect(await bcrypt.compare(password, stored!.passwordHash)).toBe(true);
    });

    it("normalizes email and rejects duplicates case-insensitively", async () => {
        const email = testEmail("normalize");

        const first = await request(app)
            .post("/api/v1/auth/register")
            .send({ email: `  ${email.toUpperCase()}  `, password: "ValidPassword123!" });
        expect(first.status).toBe(201);
        expect(first.body.data.user.email).toBe(email);

        const second = await request(app)
            .post("/api/v1/auth/register")
            .send({ email: ` ${email} `, password: "AnotherPassword123!" });
        expect(second.status).toBe(409);
        expect(errorResponseSchema.parse(second.body).error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("handles duplicate and concurrent registrations", async () => {
        const email = testEmail("race");
        const payload = { email, password: "ValidPassword123!" };

        const duplicate = await request(app).post("/api/v1/auth/register").send(payload);
        expect(duplicate.status).toBe(201);
        const again = await request(app).post("/api/v1/auth/register").send(payload);
        expect(again.status).toBe(409);

        const raceEmail = testEmail("race");
        const responses = await Promise.all(
            Array.from({ length: 5 }, () =>
                request(app).post("/api/v1/auth/register").send({
                    email: raceEmail,
                    password: "ValidPassword123!",
                }),
            ),
        );
        expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
        expect(responses.filter((res) => res.status === 409)).toHaveLength(4);
        expect(await prisma.user.count({ where: { email: raceEmail } })).toBe(1);
    });

    it("rejects invalid payloads and malformed JSON", async () => {
        const badPayloads = [
            {},
            { email: testEmail("missing-password") },
            { password: "ValidPassword123!" },
            { email: "not-an-email", password: "ValidPassword123!" },
            { email: testEmail("short"), password: "1234567" },
            { email: testEmail("long"), password: "a".repeat(73) },
            { email: testEmail("unicode"), password: "界".repeat(25) },
            { email: testEmail("extra-role"), password: "ValidPassword123!", role: "admin" },
            { email: testEmail("extra-id"), password: "ValidPassword123!", id: randomUUID() },
            { email: testEmail("spoof"), password: "ValidPassword123!", createdAt: "2026-01-01T00:00:00.000Z" },
            null,
            [],
        ];

        for (const payload of badPayloads) {
            const res = await request(app).post("/api/v1/auth/register").send(payload);
            expect(res.status).toBe(400);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INVALID_INPUT");
            expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|stack|SELECT|INSERT|UPDATE/i);
        }

        const malformed = await request(app)
            .post("/api/v1/auth/register")
            .set("Content-Type", "application/json")
            .set("X-Request-ID", randomUUID())
            .send('{"email":');
        expect(malformed.status).toBe(400);
        expect(errorResponseSchema.parse(malformed.body).error.code).toBe("INVALID_INPUT");
    });

    it("accepts exactly 72 UTF-8 bytes and rejects 73", async () => {
        const acceptable = testEmail("72bytes");
        const password72 = "界".repeat(24);
        expect(Buffer.byteLength(password72, "utf8")).toBe(72);

        const ok = await request(app)
            .post("/api/v1/auth/register")
            .send({ email: acceptable, password: password72 });
        expect(ok.status).toBe(201);

        const bad = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: testEmail("73bytes"),
                password: "界".repeat(24) + "x",
            });
        expect(bad.status).toBe(400);
        expect(await prisma.user.count({ where: { email: { in: [...testEmails] } } })).toBe(1);
    });

    it("reflects a valid request ID and returns no sensitive details", async () => {
        const requestId = randomUUID();
        const res = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Request-ID", requestId)
            .send({ email: "invalid", password: "short" });

        expect(res.status).toBe(400);
        expect(res.headers["x-request-id"]).toBe(requestId);
        const parsed = errorResponseSchema.parse(res.body);
        expect(parsed.error.requestId).toBe(requestId);
        expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|stack|SQL/i);
    });
});
