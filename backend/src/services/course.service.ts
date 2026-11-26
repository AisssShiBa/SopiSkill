import type {
    CourseDetailDTO,
    CourseSummaryDTO,
    CreateCourseRequest,
    PaginationMeta,
    PaginationQuery,
} from "@sopiskill/shared";

import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface CourseCreatedDTO {
    id: string;
    title: string;
    description: string | null;
    status: "draft";
    createdAt: string;
}

export interface PaginatedCoursesResult {
    data: CourseSummaryDTO[];
    meta: PaginationMeta;
}

function isPrismaForeignKeyError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2003"
    );
}

export async function createDraftCourse(
    ownerId: string,
    input: CreateCourseRequest,
): Promise<CourseCreatedDTO> {
    try {
        const course = await prisma.course.create({
            data: {
                ownerId,
                title: input.title,
                description: input.description ?? null,
                status: "draft",
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                createdAt: true,
            },
        });

        return {
            id: course.id,
            title: course.title,
            description: course.description,
            status: "draft",
            createdAt: course.createdAt.toISOString(),
        };
    } catch (error) {
        if (isPrismaForeignKeyError(error)) {
            throw new AppError(
                401,
                "UNAUTHORIZED",
                "Người dùng xác thực không tồn tại",
            );
        }
        throw error;
    }
}

export async function listCoursesByOwner(
    ownerId: string,
    pagination: PaginationQuery,
): Promise<PaginatedCoursesResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [courses, total] = await prisma.$transaction([
        prisma.course.findMany({
            where: { ownerId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.course.count({
            where: { ownerId },
        }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
        data: courses.map((course) => ({
            id: course.id,
            title: course.title,
            status: course.status,
            createdAt: course.createdAt.toISOString(),
        })),
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
    };
}

export async function getCourseDetailByOwner(
    ownerId: string,
    courseId: string,
): Promise<CourseDetailDTO> {
    const course = await prisma.course.findFirst({
        where: {
            id: courseId,
            ownerId,
        },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: {
                    lessons: true,
                },
            },
        },
    });

    if (!course) {
        throw new AppError(
            404,
            "COURSE_NOT_FOUND",
            "Không tìm thấy khóa học",
        );
    }

    return {
        id: course.id,
        title: course.title,
        description: course.description,
        status: course.status,
        lessonCount: course._count.lessons,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
    };
}
