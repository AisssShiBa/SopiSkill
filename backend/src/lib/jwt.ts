import jwt from "jsonwebtoken";
import { uuidSchema } from "@sopiskill/shared";

import { AppError } from "./errors.js";

export interface VerifiedAccessToken {
    userId: string;
}

function getJwtAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
        throw new AppError(
            500,
            "INTERNAL_ERROR",
            "Lỗi cấu hình xác thực hệ thống",
        );
    }
    return secret;
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
    const secret = getJwtAccessSecret();

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        });

        if (typeof decoded !== "object" || decoded === null) {
            throw new AppError(
                401,
                "UNAUTHORIZED",
                "Token xác thực không hợp lệ",
            );
        }

        const payload = decoded as jwt.JwtPayload & { userId?: unknown };
        const candidateUserId =
            typeof payload.sub === "string"
                ? payload.sub
                : typeof payload.userId === "string"
                  ? payload.userId
                  : null;

        const parsedUserId = uuidSchema.safeParse(candidateUserId);
        if (!parsedUserId.success) {
            throw new AppError(
                401,
                "UNAUTHORIZED",
                "Token xác thực không chứa định danh hợp lệ",
            );
        }

        return { userId: parsedUserId.data };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(
            401,
            "UNAUTHORIZED",
            "Token xác thực không hợp lệ hoặc đã hết hạn",
        );
    }
}
