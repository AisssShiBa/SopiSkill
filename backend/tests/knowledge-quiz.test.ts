import { randomUUID } from "node:crypto";
import {
    courseSkillGraphResponseSchema,
    errorResponseSchema,
    questionListResponseSchema,
} from "@sopiskill/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { cleanupTestFixtures, createTestUser } from "./fixtures/auth.fixture.js";

async function createLearningFixture(ownerId: string) {
    return prisma.$transaction(async (tx) => {
        const course = await tx.course.create({
            data: { ownerId, title: "Danh sách liên kết", status: "ready" },
        });
        const draftCourse = await tx.course.create({
            data: { ownerId, title: "Khóa nháp", status: "draft" },
        });
        const unmappedCourse = await tx.course.create({
            data: { ownerId, title: "Khóa thiếu mapping", status: "ready" },
        });
        const lesson = await tx.lesson.create({
            data: { courseId: course.id, title: "Chèn Node", position: 1, content: "Học Node" },
        });
        const emptyLesson = await tx.lesson.create({
            data: { courseId: course.id, title: "Bài trống", position: 2, content: "Bài đọc" },
        });
        const draftLesson = await tx.lesson.create({
            data: { courseId: draftCourse.id, title: "Bài nháp", position: 1, content: "Bản nháp" },
        });
        const unmappedLesson = await tx.lesson.create({
            data: { courseId: unmappedCourse.id, title: "Bài thiếu mapping", position: 1, content: "Bài đọc" },
        });

        const node = await tx.skill.create({
            data: { courseId: course.id, skillKey: "01-node", name: "Hiểu Node" },
        });
        const traversal = await tx.skill.create({
            data: { courseId: course.id, skillKey: "02-traversal", name: "Duyệt danh sách" },
        });
        const insert = await tx.skill.create({
            data: { courseId: course.id, skillKey: "03-insert", name: "Chèn đầu" },
        });
        const oldMapping = await tx.skillMappingVersion.create({
            data: { courseId: course.id, versionNumber: 1, status: "approved", approvedAt: new Date() },
        });
        const currentMapping = await tx.skillMappingVersion.create({
            data: { courseId: course.id, versionNumber: 2, status: "approved", approvedAt: new Date() },
        });
        const draftMapping = await tx.skillMappingVersion.create({
            data: { courseId: course.id, versionNumber: 3, status: "draft" },
        });
        await tx.skillPrerequisite.createMany({
            data: [
                { mappingVersionId: oldMapping.id, skillId: traversal.id, prerequisiteSkillId: node.id },
                { mappingVersionId: currentMapping.id, skillId: insert.id, prerequisiteSkillId: traversal.id },
                { mappingVersionId: draftMapping.id, skillId: insert.id, prerequisiteSkillId: node.id },
            ],
        });

        const question = await tx.question.create({
            data: { lessonId: lesson.id, status: "active" },
        });
        const archivedQuestion = await tx.question.create({
            data: { lessonId: lesson.id, status: "archived" },
        });
        const options = [
            { id: "a", text: "Head hiện tại", isCorrect: true },
            { id: "b", text: "Null", explanation: "Dữ liệu riêng của fixture" },
            { id: "c", text: "Tail hiện tại" },
            { id: "d", text: "Chính Node mới" },
        ];
        const [currentQuestionVersion, draftQuestionVersion, archivedQuestionVersion] = await Promise.all([
            tx.questionVersion.create({
                data: {
                    questionId: question.id, versionNumber: 1, prompt: "X.next trỏ vào đâu?",
                    options, answerKey: "a", explanation: "Giải thích riêng",
                },
            }),
            tx.questionVersion.create({
                data: {
                    questionId: question.id, versionNumber: 2, prompt: "Câu hỏi đang sửa",
                    options, answerKey: "a",
                },
            }),
            tx.questionVersion.create({
                data: {
                    questionId: archivedQuestion.id, versionNumber: 1, prompt: "Câu hỏi đã lưu trữ",
                    options, answerKey: "a",
                },
            }),
        ]);
        await tx.questionSkill.createMany({
            data: [
                { mappingVersionId: currentMapping.id, questionVersionId: currentQuestionVersion.id, skillId: insert.id, isPrimary: true },
                { mappingVersionId: currentMapping.id, questionVersionId: archivedQuestionVersion.id, skillId: insert.id, isPrimary: true },
                { mappingVersionId: draftMapping.id, questionVersionId: draftQuestionVersion.id, skillId: insert.id, isPrimary: true },
            ],
        });

        return {
            course, unmappedCourse, lesson, emptyLesson, draftLesson, unmappedLesson,
            currentMapping, draftMapping, node, traversal, insert, question,
            currentQuestionVersion, draftQuestionVersion,
        };
    });
}

describe("KC-01 và QUIZ-01 qua Express và PostgreSQL", () => {
    let owner: Awaited<ReturnType<typeof createTestUser>>;
    let outsider: Awaited<ReturnType<typeof createTestUser>>;
    let fixture: Awaited<ReturnType<typeof createLearningFixture>>;

    beforeAll(async () => {
        owner = await createTestUser("kc-quiz-owner");
        outsider = await createTestUser("kc-quiz-outsider");
        fixture = await createLearningFixture(owner.id);
    });

    afterAll(async () => {
        try {
            if (fixture) {
                const courseId = fixture.course.id;
                await prisma.$transaction([
                    prisma.questionSkill.deleteMany({ where: { mappingVersion: { courseId } } }),
                    prisma.skillPrerequisite.deleteMany({ where: { mappingVersion: { courseId } } }),
                    prisma.questionVersion.deleteMany({ where: { question: { lesson: { courseId } } } }),
                    prisma.question.deleteMany({ where: { lesson: { courseId } } }),
                    prisma.skillMappingVersion.deleteMany({ where: { courseId } }),
                    prisma.skill.deleteMany({ where: { courseId } }),
                ]);
            }
            await cleanupTestFixtures();
        } finally {
            await prisma.$disconnect();
        }
    });

    function getGraph(courseId: string, token = owner.accessToken) {
        return request(app).get(`/api/v1/courses/${courseId}/skills`).auth(token, { type: "bearer" });
    }

    function getQuestions(lessonId: string, token = owner.accessToken) {
        return request(app).get(`/api/v1/lessons/${lessonId}/questions`).auth(token, { type: "bearer" });
    }

    async function expectError(
        response: PromiseLike<{ status: number; body: unknown }>,
        status: number,
        code: string,
    ) {
        const result = await response;
        expect(result.status).toBe(status);
        expect(errorResponseSchema.parse(result.body).error.code).toBe(code);
    }

    it("KC-01 trả graph thuộc bản approved mới nhất, bỏ qua bản draft mới hơn", async () => {
        const response = await getGraph(fixture.course.id).expect(200);
        expect(courseSkillGraphResponseSchema.parse(response.body).data).toEqual({
            courseId: fixture.course.id,
            mappingVersionId: fixture.currentMapping.id,
            mappingVersionNumber: 2,
            skills: [fixture.node, fixture.traversal, fixture.insert].map(
                ({ id, skillKey, name }) => ({ id, skillKey, name }),
            ),
            prerequisites: [{
                skillId: fixture.insert.id,
                prerequisiteSkillId: fixture.traversal.id,
            }],
        });
    });

    it("KC-01 kiểm tra token, UUID, quyền sở hữu và mapping đã duyệt", async () => {
        await expectError(
            request(app).get(`/api/v1/courses/${fixture.course.id}/skills`), 401, "UNAUTHORIZED",
        );
        await expectError(getGraph("invalid"), 400, "INVALID_INPUT");
        await expectError(getGraph(randomUUID()), 404, "COURSE_NOT_FOUND");
        await expectError(getGraph(fixture.course.id, outsider.accessToken), 404, "COURSE_NOT_FOUND");
        await expectError(getGraph(fixture.unmappedCourse.id), 409, "MAPPING_NOT_APPROVED");
    });

    it("QUIZ-01 trả bản câu hỏi của mapping đã duyệt và chỉ các field công khai", async () => {
        const response = await getQuestions(fixture.lesson.id).expect(200);
        const expected = {
            data: [{
                id: fixture.question.id,
                questionVersionId: fixture.currentQuestionVersion.id,
                versionNumber: 1,
                type: "single_choice",
                prompt: "X.next trỏ vào đâu?",
                options: [
                    { id: "a", text: "Head hiện tại" },
                    { id: "b", text: "Null" },
                    { id: "c", text: "Tail hiện tại" },
                    { id: "d", text: "Chính Node mới" },
                ],
            }],
        };
        expect(response.body).toEqual(expected);
        expect(questionListResponseSchema.parse(response.body)).toEqual(expected);
    });

    it("QUIZ-01 trả danh sách rỗng cho Lesson hợp lệ chưa có câu hỏi", async () => {
        const response = await getQuestions(fixture.emptyLesson.id).expect(200);
        expect(questionListResponseSchema.parse(response.body)).toEqual({ data: [] });
    });

    it("QUIZ-01 kiểm tra token, UUID, quyền sở hữu và trạng thái của Course", async () => {
        await expectError(
            request(app).get(`/api/v1/lessons/${fixture.lesson.id}/questions`), 401, "UNAUTHORIZED",
        );
        await expectError(getQuestions(fixture.lesson.id, "invalid-token"), 401, "UNAUTHORIZED");
        await expectError(getQuestions("invalid"), 400, "INVALID_INPUT");
        await expectError(getQuestions(randomUUID()), 404, "LESSON_NOT_FOUND");
        await expectError(getQuestions(fixture.lesson.id, outsider.accessToken), 404, "LESSON_NOT_FOUND");
        await expectError(getQuestions(fixture.draftLesson.id), 409, "COURSE_NOT_READY");
        await expectError(getQuestions(fixture.unmappedLesson.id), 409, "MAPPING_NOT_APPROVED");
    });

    it("hai API cùng chuyển sang mapping mới sau khi bản đó được duyệt", async () => {
        await prisma.skillMappingVersion.update({
            where: { id: fixture.draftMapping.id },
            data: { status: "approved", approvedAt: new Date() },
        });

        try {
            const graphResponse = await getGraph(fixture.course.id).expect(200);
            const graph = courseSkillGraphResponseSchema.parse(graphResponse.body).data;
            expect(graph.mappingVersionId).toBe(fixture.draftMapping.id);
            expect(graph.prerequisites).toEqual([{
                skillId: fixture.insert.id,
                prerequisiteSkillId: fixture.node.id,
            }]);

            const quizResponse = await getQuestions(fixture.lesson.id).expect(200);
            const { data } = questionListResponseSchema.parse(quizResponse.body);
            expect(data.map(({ questionVersionId }) => questionVersionId))
                .toEqual([fixture.draftQuestionVersion.id]);
        } finally {
            await prisma.skillMappingVersion.update({
                where: { id: fixture.draftMapping.id },
                data: { status: "draft", approvedAt: null },
            });
        }
    });
});
