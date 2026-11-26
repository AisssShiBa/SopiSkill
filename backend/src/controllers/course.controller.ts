import type { NextFunction, Request, Response } from "express";
import {
    courseDetailResponseSchema,
    courseListResponseSchema,
    createCourseRequestSchema,
    createCourseResponseSchema,
    paginationQuerySchema,
    uuidSchema,
} from "@sopiskill/shared";

import { AppError, formatZodIssues } from "../lib/errors.js";
import {
    createDraftCourse,
    getCourseDetailByOwner,
    listCoursesByOwner,
} from "../services/course.service.js";

function requireUserId(req: Request): string {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new AppError(401, "UNAUTHORIZED", "Chưa xác thực người dùng");
    }
    return userId;
}

export async function createCourseHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const ownerId = requireUserId(req);
        const parsed = createCourseRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError(
                400,
                "INVALID_INPUT",
                "Dữ liệu tạo khóa học không hợp lệ",
                formatZodIssues(parsed.error.issues),
            );
        }

        const course = await createDraftCourse(ownerId, parsed.data);
        const response = createCourseResponseSchema.parse({ data: course });
        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
}

export async function listCoursesHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const ownerId = requireUserId(req);
        const parsed = paginationQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError(
                400,
                "INVALID_PAGINATION",
                "Tham số phân trang không hợp lệ",
                formatZodIssues(parsed.error.issues),
            );
        }

        const result = await listCoursesByOwner(ownerId, parsed.data);
        const response = courseListResponseSchema.parse(result);
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}

export async function getCourseDetailHandler(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const ownerId = requireUserId(req);
        const parsedCourseId = uuidSchema.safeParse(req.params.courseId);
        if (!parsedCourseId.success) {
            throw new AppError(
                400,
                "INVALID_INPUT",
                "Mã khóa học phải là UUID v4 hợp lệ",
                formatZodIssues(parsedCourseId.error.issues),
            );
        }

        const course = await getCourseDetailByOwner(ownerId, parsedCourseId.data);
        const response = courseDetailResponseSchema.parse({ data: course });
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}
