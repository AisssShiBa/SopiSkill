import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

const BEARER_HEADER_REGEX = /^Bearer (\S+)$/;

export function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const authHeader = req.header("authorization");
    if (!authHeader) {
        next(
            new AppError(
                401,
                "UNAUTHORIZED",
                "Thiếu thông tin xác thực Bearer token",
            ),
        );
        return;
    }

    const match = BEARER_HEADER_REGEX.exec(authHeader);
    if (!match) {
        next(
            new AppError(
                401,
                "UNAUTHORIZED",
                "Định dạng Authorization header không hợp lệ",
            ),
        );
        return;
    }

    try {
        const verified = verifyAccessToken(match[1]);
        req.auth = { userId: verified.userId };
        next();
    } catch (error) {
        next(error);
    }
}
