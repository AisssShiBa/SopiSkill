import type { NextFunction, Request, Response } from "express";

import { AppError, sendErrorResponse } from "../lib/errors.js";

interface ExpressBodyParserError extends Error {
    status?: number;
    type?: string;
}

export function notFoundHandler(req: Request, res: Response): void {
    sendErrorResponse(
        req,
        res,
        404,
        "NOT_FOUND",
        "Không tìm thấy đường dẫn yêu cầu",
    );
}

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof AppError) {
        sendErrorResponse(
            req,
            res,
            err.statusCode,
            err.code,
            err.message,
            err.details,
        );
        return;
    }

    const parserErr = err as ExpressBodyParserError | null;
    if (
        err instanceof SyntaxError &&
        parserErr?.status === 400 &&
        parserErr?.type === "entity.parse.failed"
    ) {
        sendErrorResponse(
            req,
            res,
            400,
            "INVALID_INPUT",
            "Dữ liệu JSON không hợp lệ",
        );
        return;
    }

    if (parserErr?.type === "entity.too.large") {
        sendErrorResponse(
            req,
            res,
            400,
            "INVALID_INPUT",
            "Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép",
        );
        return;
    }

    if (process.env.NODE_ENV !== "test") {
        console.error(
            `Unhandled error [requestId=${req.requestId}]:`,
            err instanceof Error ? err.message : "Unknown error",
        );
    }

    sendErrorResponse(
        req,
        res,
        500,
        "INTERNAL_ERROR",
        "Đã xảy ra lỗi hệ thống",
    );
}
