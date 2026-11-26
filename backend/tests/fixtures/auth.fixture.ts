import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

import { prisma } from "../../src/lib/prisma.js";

export interface TestUserFixture {
    id: string;
    email: string;
    accessToken: string;
}

const createdUserIds = new Set<string>();

export function getTestJwtSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is required for test fixtures");
    }
    return secret;
}

export function signTestAccessToken(
    payload: Record<string, unknown>,
    options?: { secret?: string; expiresIn?: SignOptions["expiresIn"] },
): string {
    return jwt.sign(payload, options?.secret ?? getTestJwtSecret(), {
        algorithm: "HS256",
        expiresIn: options?.expiresIn ?? 900,
    });
}

export async function createTestUser(label = "user"): Promise<TestUserFixture> {
    const uniqueSuffix = randomUUID();
    const email = `${label}-${uniqueSuffix}@sopiskill.test`;

    const user = await prisma.user.create({
        data: {
            email,
            // Fixture-only dummy hash; AUTH-01/AUTH-02 handles real bcrypt hashing.
            passwordHash: "$2a$10$fixtureHashNotForRealLogin000000000000000000000000000",
        },
        select: {
            id: true,
            email: true,
        },
    });

    createdUserIds.add(user.id);

    const accessToken = signTestAccessToken({
        sub: user.id,
        email: user.email,
    });

    return {
        id: user.id,
        email: user.email,
        accessToken,
    };
}

export async function cleanupTestFixtures(): Promise<void> {
    if (createdUserIds.size === 0) {
        return;
    }

    const userIds = Array.from(createdUserIds);

    const courses = await prisma.course.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true },
    });
    const courseIds = courses.map((course) => course.id);

    if (courseIds.length > 0) {
        await prisma.lesson.deleteMany({
            where: { courseId: { in: courseIds } },
        });
        await prisma.course.deleteMany({
            where: { id: { in: courseIds } },
        });
    }

    await prisma.user.deleteMany({
        where: { id: { in: userIds } },
    });

    createdUserIds.clear();
}
