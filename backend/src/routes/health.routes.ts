
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { errorResponseSchema } from "@sopiskill/shared";

import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

// GET /api/v1/health
healthRouter.get("/", (_req, res) => {
    res.status(200).json({
        data: {
            status: "ok",
            service: "sopiskill-backend",
        },
    });
});

// GET /api/v1/health/db
healthRouter.get("/db", async (_req, res) => {
    try {
        // Truy vấn đọc để kiểm tra PostgreSQL
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            data: {
                status: "ok",
                database: "connected",
            },
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        const response = errorResponseSchema.parse({
            error: {
                code: "DATABASE_UNAVAILABLE",
                message: "Database unavailable",
                details: null,
                requestId: randomUUID(),
            },
        });

        res.status(503).json(response);
    }
});
