import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export async function getCurrentApprovedMapping(courseId: string) {
    const mapping = await prisma.skillMappingVersion.findFirst({
        where: { courseId, status: "approved" },
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true },
    });

    if (!mapping) {
        throw new AppError(
            409,
            "MAPPING_NOT_APPROVED",
            "Khóa học chưa có sơ đồ kỹ năng được duyệt",
        );
    }

    return mapping;
}
