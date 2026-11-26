import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { errorResponseSchema, uuidSchema, type ApiErrorResponse } from "@sopiskill/shared";

export interface ValidationIssueDetail {
    path: string;
    message: string;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details: unknown | null;

    constructor(
        statusCode: number,
        code: string,
        message: string,
        details: unknown | null = null,
    ) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function formatZodIssues(
    issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): ValidationIssueDetail[] {
    return issues.map((issue) => ({
        path: issue.path.map((segment) => String(segment)).join("."),
        message: issue.message,
    }));
}

export function buildErrorResponse(params: {
    code: string;
    message: string;
    details?: unknown | null;
    requestId?: string;
}): ApiErrorResponse {
    const validRequestId =
        params.requestId && uuidSchema.safeParse(params.requestId).success
            ? params.requestId
            : randomUUID();

    return errorResponseSchema.parse({
        error: {
            code: params.code,
            message: params.message,
            details: params.details ?? null,
            requestId: validRequestId,
        },
    });
}

export function sendErrorResponse(
    req: Request,
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details: unknown | null = null,
): void {
    const payload = buildErrorResponse({
        code,
        message,
        details,
        requestId: req.requestId,
    });
    res.status(statusCode).json(payload);
}
