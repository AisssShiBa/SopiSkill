import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
    courseDetailResponseSchema,
    courseListResponseSchema,
    createCourseResponseSchema,
    errorResponseSchema,
} from "@sopiskill/shared";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
    cleanupTestFixtures,
    createTestUser,
    signTestAccessToken,
} from "./fixtures/auth.fixture.js";

afterEach(async () => {
    await cleanupTestFixtures();
});

afterAll(async () => {
    await cleanupTestFixtures();
    await prisma.$disconnect();
});

describe("Course API Authentication & Tracing", () => {
    it("từ chối request không có Authorization Bearer trên cả 3 endpoint Course", async () => {
        const courseId = randomUUID();

        const [postRes, listRes, detailRes] = await Promise.all([
            request(app).post("/api/v1/courses").send({ title: "Linked List" }),
            request(app).get("/api/v1/courses"),
            request(app).get(`/api/v1/courses/${courseId}`),
        ]);

        for (const res of [postRes, listRes, detailRes]) {
            expect(res.status).toBe(401);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("UNAUTHORIZED");
            expect(parsed.error.details).toBeNull();
        }
    });

    it("từ chối token sai định dạng, sai chữ ký, hết hạn hoặc sub không phải UUID v4", async () => {
        const user = await createTestUser("auth-check");

        const wrongSecretToken = signTestAccessToken(
            { sub: user.id },
            { secret: "completely-wrong-secret-key" },
        );
        const expiredToken = signTestAccessToken(
            { sub: user.id },
            { expiresIn: -10 },
        );
        const invalidSubToken = signTestAccessToken({ sub: "not-a-uuid" });

        const cases = [
            "Basic dXNlcjpwYXNz",
            "Bearer",
            `Bearer ${wrongSecretToken}`,
            `Bearer ${expiredToken}`,
            `Bearer ${invalidSubToken}`,
        ];

        for (const authHeader of cases) {
            const res = await request(app)
                .get("/api/v1/courses")
                .set("Authorization", authHeader);

            expect(res.status).toBe(401);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("UNAUTHORIZED");
        }
    });

    it("chấp nhận token có claim userId (tương thích dự phòng) và giữ X-Request-ID hợp lệ", async () => {
        const user = await createTestUser("userid-claim");
        const tokenWithUserId = signTestAccessToken({ userId: user.id });
        const customRequestId = randomUUID();

        const res = await request(app)
            .get("/api/v1/courses")
            .set("Authorization", `Bearer ${tokenWithUserId}`)
            .set("X-Request-ID", customRequestId);

        expect(res.status).toBe(200);
        expect(res.headers["x-request-id"]).toBe(customRequestId);
        courseListResponseSchema.parse(res.body);
    });
});

describe("COURSE-01: POST /api/v1/courses", () => {
    it("tạo khóa học draft với title + description và gán ownerId từ JWT", async () => {
        const userA = await createTestUser("owner-a");

        const res = await request(app)
            .post("/api/v1/courses")
            .set("Authorization", `Bearer ${userA.accessToken}`)
            .send({
                title: "  Danh sách liên kết đơn trong C++  ",
                description: "  Mục tiêu: học Node, Traversal và Insertion  ",
            });

        expect(res.status).toBe(201);
        const parsed = createCourseResponseSchema.parse(res.body);
        expect(parsed.data.title).toBe("Danh sách liên kết đơn trong C++");
        expect(parsed.data.description).toBe(
            "Mục tiêu: học Node, Traversal và Insertion",
        );
        expect(parsed.data.status).toBe("draft");
        expect("ownerId" in res.body.data).toBe(false);

        const saved = await prisma.course.findUnique({
            where: { id: parsed.data.id },
        });
        expect(saved).not.toBeNull();
        expect(saved?.ownerId).toBe(userA.id);
        expect(saved?.status).toBe("draft");
        expect(saved?.title).toBe("Danh sách liên kết đơn trong C++");
        expect(saved?.description).toBe(
            "Mục tiêu: học Node, Traversal và Insertion",
        );
    });

    it("tạo khóa học draft không có description và trả description = null", async () => {
        const userA = await createTestUser("no-desc");

        const res = await request(app)
            .post("/api/v1/courses")
            .set("Authorization", `Bearer ${userA.accessToken}`)
            .send({
                title: "Cây nhị phân tìm kiếm",
            });

        expect(res.status).toBe(201);
        const parsed = createCourseResponseSchema.parse(res.body);
        expect(parsed.data.description).toBeNull();
        expect(parsed.data.status).toBe("draft");
    });

    it("T-COURSE-02: từ chối body chứa ownerId giả hoặc status/id do client gửi", async () => {
        const userA = await createTestUser("spoof-a");
        const userB = await createTestUser("spoof-b");

        const invalidPayloads = [
            { title: "Fake Owner", ownerId: userB.id },
            { title: "Fake Status", status: "ready" },
            { title: "Fake ID", id: randomUUID() },
        ];

        for (const payload of invalidPayloads) {
            const res = await request(app)
                .post("/api/v1/courses")
                .set("Authorization", `Bearer ${userA.accessToken}`)
                .send(payload);

            expect(res.status).toBe(400);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INVALID_INPUT");
        }

        const totalCourses = await prisma.course.count({
            where: { ownerId: { in: [userA.id, userB.id] } },
        });
        expect(totalCourses).toBe(0);
    });

    it("trả 400 INVALID_INPUT khi thiếu title, title rỗng/quá dài, description rỗng hoặc JSON lỗi", async () => {
        const userA = await createTestUser("validate");

        const badBodies = [
            {},
            { title: "   " },
            { title: "a".repeat(201) },
            { title: "Valid Title", description: "   " },
            { title: "Valid Title", description: "d".repeat(2001) },
        ];

        for (const body of badBodies) {
            const res = await request(app)
                .post("/api/v1/courses")
                .set("Authorization", `Bearer ${userA.accessToken}`)
                .send(body);

            expect(res.status).toBe(400);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INVALID_INPUT");
        }

        const malformedRes = await request(app)
            .post("/api/v1/courses")
            .set("Authorization", `Bearer ${userA.accessToken}`)
            .set("Content-Type", "application/json")
            .send('{"title": "Broken JSON"');

        expect(malformedRes.status).toBe(400);
        const parsedMalformed = errorResponseSchema.parse(malformedRes.body);
        expect(parsedMalformed.error.code).toBe("INVALID_INPUT");
    });

    it("trả 401 UNAUTHORIZED khi token chứa userId không tồn tại trong database", async () => {
        const ghostToken = signTestAccessToken({ sub: randomUUID() });

        const res = await request(app)
            .post("/api/v1/courses")
            .set("Authorization", `Bearer ${ghostToken}`)
            .send({ title: "Ghost User Course" });

        expect(res.status).toBe(401);
        const parsed = errorResponseSchema.parse(res.body);
        expect(parsed.error.code).toBe("UNAUTHORIZED");
    });
});

describe("COURSE-02: GET /api/v1/courses", () => {
    it("trả danh sách rỗng đúng chuẩn phân trang khi user chưa có khóa học nào", async () => {
        const userA = await createTestUser("empty-list");

        const res = await request(app)
            .get("/api/v1/courses")
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(res.status).toBe(200);
        const parsed = courseListResponseSchema.parse(res.body);
        expect(parsed.data).toEqual([]);
        expect(parsed.meta).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
        });
    });

    it("chỉ trả khóa học của chủ sở hữu (người A không thấy khóa học của người B) và hỗ trợ phân trang + sắp xếp mới nhất trước", async () => {
        const userA = await createTestUser("list-a");
        const userB = await createTestUser("list-b");

        const t1 = new Date("2026-11-20T08:00:00.000Z");
        const t2 = new Date("2026-11-21T08:00:00.000Z");
        const t3 = new Date("2026-11-22T08:00:00.000Z");

        const courseA1 = await prisma.course.create({
            data: {
                ownerId: userA.id,
                title: "A Course 1",
                status: "draft",
                createdAt: t1,
            },
        });
        const courseA2 = await prisma.course.create({
            data: {
                ownerId: userA.id,
                title: "A Course 2",
                status: "ready",
                createdAt: t2,
            },
        });
        const courseA3 = await prisma.course.create({
            data: {
                ownerId: userA.id,
                title: "A Course 3",
                status: "draft",
                createdAt: t3,
            },
        });

        const courseB1 = await prisma.course.create({
            data: {
                ownerId: userB.id,
                title: "B Private Course",
                status: "ready",
                createdAt: t3,
            },
        });

        // Page 1, limit 2 for User A
        const page1Res = await request(app)
            .get("/api/v1/courses?page=1&limit=2")
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(page1Res.status).toBe(200);
        const page1 = courseListResponseSchema.parse(page1Res.body);
        expect(page1.meta).toEqual({
            page: 1,
            limit: 2,
            total: 3,
            totalPages: 2,
        });
        expect(page1.data.map((item) => item.id)).toEqual([
            courseA3.id,
            courseA2.id,
        ]);
        expect(page1.data.some((item) => item.id === courseB1.id)).toBe(false);

        // Page 2, limit 2 for User A
        const page2Res = await request(app)
            .get("/api/v1/courses?page=2&limit=2")
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(page2Res.status).toBe(200);
        const page2 = courseListResponseSchema.parse(page2Res.body);
        expect(page2.meta).toEqual({
            page: 2,
            limit: 2,
            total: 3,
            totalPages: 2,
        });
        expect(page2.data.map((item) => item.id)).toEqual([courseA1.id]);

        // User B only sees User B's course
        const userBRes = await request(app)
            .get("/api/v1/courses")
            .set("Authorization", `Bearer ${userB.accessToken}`);

        expect(userBRes.status).toBe(200);
        const userBList = courseListResponseSchema.parse(userBRes.body);
        expect(userBList.meta.total).toBe(1);
        expect(userBList.data.map((item) => item.id)).toEqual([courseB1.id]);
    });

    it("trả 400 INVALID_PAGINATION khi query phân trang không hợp lệ hoặc chứa tham số lạ", async () => {
        const userA = await createTestUser("bad-pagination");

        const badQueries = [
            "?page=0",
            "?page=-2",
            "?page=abc",
            "?limit=0",
            "?limit=101",
            "?limit=2.5",
            `?ownerId=${userA.id}`,
        ];

        for (const query of badQueries) {
            const res = await request(app)
                .get(`/api/v1/courses${query}`)
                .set("Authorization", `Bearer ${userA.accessToken}`);

            expect(res.status).toBe(400);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INVALID_PAGINATION");
        }
    });
});

describe("COURSE-03: GET /api/v1/courses/:courseId", () => {
    it("chủ sở hữu xem được chi tiết khóa học cùng lessonCount chính xác", async () => {
        const userA = await createTestUser("detail-owner");

        const course = await prisma.course.create({
            data: {
                ownerId: userA.id,
                title: "Đồ thị và Thuật toán BFS/DFS",
                description: "Khóa học đồ thị cơ bản",
                status: "ready",
                lessons: {
                    create: [
                        {
                            title: "Biểu diễn đồ thị",
                            position: 1,
                            content: "Danh sách kề và ma trận kề.",
                        },
                        {
                            title: "Duyệt theo chiều rộng BFS",
                            position: 2,
                            content: "Sử dụng hàng đợi Queue.",
                        },
                    ],
                },
            },
        });

        const res = await request(app)
            .get(`/api/v1/courses/${course.id}`)
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(res.status).toBe(200);
        const parsed = courseDetailResponseSchema.parse(res.body);
        expect(parsed.data).toMatchObject({
            id: course.id,
            title: "Đồ thị và Thuật toán BFS/DFS",
            description: "Khóa học đồ thị cơ bản",
            status: "ready",
            lessonCount: 2,
        });
        expect("ownerId" in res.body.data).toBe(false);
    });

    it("T-COURSE-01: người A không xem được chi tiết khóa học của người B (trả 404 COURSE_NOT_FOUND)", async () => {
        const userA = await createTestUser("iso-a");
        const userB = await createTestUser("iso-b");

        const courseOfB = await prisma.course.create({
            data: {
                ownerId: userB.id,
                title: "Khóa học riêng tư của B",
                description: "Không được lộ cho A",
                status: "draft",
            },
        });

        const resA = await request(app)
            .get(`/api/v1/courses/${courseOfB.id}`)
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(resA.status).toBe(404);
        const parsedA = errorResponseSchema.parse(resA.body);
        expect(parsedA.error.code).toBe("COURSE_NOT_FOUND");
        expect(JSON.stringify(resA.body)).not.toContain("Khóa học riêng tư của B");

        // Verify User B can still read their own course
        const resB = await request(app)
            .get(`/api/v1/courses/${courseOfB.id}`)
            .set("Authorization", `Bearer ${userB.accessToken}`);

        expect(resB.status).toBe(200);
        const parsedB = courseDetailResponseSchema.parse(resB.body);
        expect(parsedB.data.id).toBe(courseOfB.id);
        expect(parsedB.data.lessonCount).toBe(0);
    });

    it("trả 404 COURSE_NOT_FOUND khi courseId không tồn tại", async () => {
        const userA = await createTestUser("not-found");

        const res = await request(app)
            .get(`/api/v1/courses/${randomUUID()}`)
            .set("Authorization", `Bearer ${userA.accessToken}`);

        expect(res.status).toBe(404);
        const parsed = errorResponseSchema.parse(res.body);
        expect(parsed.error.code).toBe("COURSE_NOT_FOUND");
    });

    it("trả 400 INVALID_INPUT khi courseId không phải UUID v4 hợp lệ", async () => {
        const userA = await createTestUser("invalid-id");

        const invalidIds = [
            "course-001",
            "not-a-uuid",
            "550e8400-e29b-11d4-a716-446655440010", // UUID v1, not v4
        ];

        for (const badId of invalidIds) {
            const res = await request(app)
                .get(`/api/v1/courses/${badId}`)
                .set("Authorization", `Bearer ${userA.accessToken}`);

            expect(res.status).toBe(400);
            const parsed = errorResponseSchema.parse(res.body);
            expect(parsed.error.code).toBe("INVALID_INPUT");
        }
    });
});
