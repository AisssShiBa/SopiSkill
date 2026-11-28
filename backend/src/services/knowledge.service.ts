import type { CourseSkillGraphDTO } from "@sopiskill/shared";

import { validateSkillDag } from "../algorithms/skill-dag.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { getCurrentApprovedMapping } from "./skill-mapping.service.js";

export async function getCourseSkillGraph(
    ownerId: string,
    courseId: string,
): Promise<CourseSkillGraphDTO> {
    const course = await prisma.course.findFirst({
        where: { id: courseId, ownerId },
        select: { id: true },
    });

    if (!course) {
        throw new AppError(404, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
    }

    const mapping = await getCurrentApprovedMapping(course.id);
    const [skills, prerequisites] = await Promise.all([
        prisma.skill.findMany({
            where: { courseId: course.id },
            orderBy: { skillKey: "asc" },
            select: { id: true, skillKey: true, name: true },
        }),
        prisma.skillPrerequisite.findMany({
            where: { mappingVersionId: mapping.id },
            orderBy: [{ skillId: "asc" }, { prerequisiteSkillId: "asc" }],
            select: { skillId: true, prerequisiteSkillId: true },
        }),
    ]);

    // Bảo vệ API trước dữ liệu mapping cũ hoặc được nhập trực tiếp.
    const validation = validateSkillDag(skills.map(({ id }) => id), prerequisites);
    if (!validation.valid) {
        throw new Error(`Invalid approved skill mapping ${mapping.id}: ${validation.reason}`);
    }

    return {
        courseId: course.id,
        mappingVersionId: mapping.id,
        mappingVersionNumber: mapping.versionNumber,
        skills,
        prerequisites,
    };
}
