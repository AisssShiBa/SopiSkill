import type { Request, Response } from "express";
import { courseSkillGraphResponseSchema, uuidSchema } from "@sopiskill/shared";

import { AppError, formatZodIssues } from "../lib/errors.js";
import { getCourseSkillGraph } from "../services/knowledge.service.js";

export async function getCourseSkillGraphHandler(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
        throw new AppError(401, "UNAUTHORIZED", "Chưa xác thực người dùng");
    }

    const courseId = uuidSchema.safeParse(req.params.courseId);
    if (!courseId.success) {
        throw new AppError(
            400,
            "INVALID_INPUT",
            "Mã khóa học phải là UUID v4 hợp lệ",
            formatZodIssues(courseId.error.issues),
        );
    }

    const graph = await getCourseSkillGraph(req.auth.userId, courseId.data);
    res.status(200).json(courseSkillGraphResponseSchema.parse({ data: graph }));
}
