import type { Request, Response } from "express";
import { questionListResponseSchema, uuidSchema } from "@sopiskill/shared";

import { AppError, formatZodIssues } from "../lib/errors.js";
import { listLessonQuestions } from "../services/lesson-question.service.js";

export async function listLessonQuestionsHandler(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
        throw new AppError(401, "UNAUTHORIZED", "Chưa xác thực người dùng");
    }

    const lessonId = uuidSchema.safeParse(req.params.lessonId);
    if (!lessonId.success) {
        throw new AppError(
            400,
            "INVALID_INPUT",
            "Mã bài học phải là UUID v4 hợp lệ",
            formatZodIssues(lessonId.error.issues),
        );
    }

    const questions = await listLessonQuestions(req.auth.userId, lessonId.data);
    res.status(200).json(questionListResponseSchema.parse({ data: questions }));
}
