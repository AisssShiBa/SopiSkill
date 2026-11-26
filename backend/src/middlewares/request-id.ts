import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { uuidSchema } from "@sopiskill/shared";

export function requestIdMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const incoming = req.header("x-request-id");
    const parsed = incoming ? uuidSchema.safeParse(incoming) : null;
    const requestId = parsed?.success ? parsed.data : randomUUID();

    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
}
