import bcrypt from "bcryptjs";

import type { AuthCredentials } from "@sopiskill/shared";

import { AppError } from "../lib/errors.js";
import { signAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

interface RegisteredUserDTO {
    id: string;
    email: string;
    createdAt: string;
}

const DUMMY_PASSWORD_HASH =
    "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function isUniqueConstraintError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2002"
    );
}

export async function registerUser(
    input: AuthCredentials,
): Promise<RegisteredUserDTO> {
    const existing = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
    });
    if (existing) {
        throw new AppError(
            409,
            "EMAIL_ALREADY_EXISTS",
            "Email đã được sử dụng",
        );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email: input.email,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
        });

        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError(
                409,
                "EMAIL_ALREADY_EXISTS",
                "Email đã được sử dụng",
            );
        }
        throw error;
    }
}

export async function loginUser(input: AuthCredentials): Promise<{
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    user: { id: string; email: string };
}> {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
            id: true,
            email: true,
            passwordHash: true,
        },
    });

    const passwordMatches = await bcrypt.compare(
        input.password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
        throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Email hoặc mật khẩu không đúng",
        );
    }

    const accessToken = signAccessToken(user.id);

    return {
        accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
        user: {
            id: user.id,
            email: user.email,
        },
    };
}
