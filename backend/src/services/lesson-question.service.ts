import { optionPublicSchema, type QuestionPublicDTO } from "@sopiskill/shared";

import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { getCurrentApprovedMapping } from "./skill-mapping.service.js";

const publicOptionsSchema = optionPublicSchema.strip().array();

export async function listLessonQuestions(
    ownerId: string,
    lessonId: string,
): Promise<QuestionPublicDTO[]> {
    const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, course: { ownerId } },
        select: { id: true, course: { select: { id: true, status: true } } },
    });

    if (!lesson) {
        throw new AppError(404, "LESSON_NOT_FOUND", "Không tìm thấy bài học");
    }
    if (lesson.course.status !== "ready") {
        throw new AppError(409, "COURSE_NOT_READY", "Khóa học chưa sẵn sàng");
    }

    const mapping = await getCurrentApprovedMapping(lesson.course.id);
    const questionVersions = await prisma.questionVersion.findMany({
        where: {
            question: { lessonId: lesson.id, status: "active" },
            skillMappings: {
                some: { mappingVersionId: mapping.id, skill: { courseId: lesson.course.id } },
            },
        },
        orderBy: [{ questionId: "asc" }, { versionNumber: "asc" }],
        select: {
            id: true,
            questionId: true,
            versionNumber: true,
            type: true,
            prompt: true,
            options: true,
        },
    });

    const seenQuestions = new Set<string>();
    return questionVersions.map((version) => {
        if (seenQuestions.has(version.questionId)) {
            throw new Error(`Multiple versions of question ${version.questionId} in mapping ${mapping.id}`);
        }
        seenQuestions.add(version.questionId);

        return {
            id: version.questionId,
            questionVersionId: version.id,
            versionNumber: version.versionNumber,
            type: version.type,
            prompt: version.prompt,
            options: publicOptionsSchema.parse(version.options),
        };
    });
}
