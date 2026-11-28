import type { NextFunction, Request, Response } from "express";
import {
    authCredentialsSchema,
    authLoginResponseSchema,
    authRegisterResponseSchema,
} from "@sopiskill/shared";

import { AppError, formatZodIssues } from "../lib/errors.js";
import { loginUser, registerUser } from "../services/auth.service.js";

function parseCredentials(req: Request): { email: string; password: string } {
    const parsed = authCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new AppError(
            400,
            "INVALID_INPUT",
            "Thông tin xác thực không hợp lệ",
            formatZodIssues(parsed.error.issues),
        );
    }
    return parsed.data;
}

export async function registerHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const credentials = parseCredentials(req);
        const user = await registerUser(credentials);
        const response = authRegisterResponseSchema.parse({
            data: { user },
        });
        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
}

export async function loginHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const credentials = parseCredentials(req);
        const result = await loginUser(credentials);
        const response = authLoginResponseSchema.parse({ data: result });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}
