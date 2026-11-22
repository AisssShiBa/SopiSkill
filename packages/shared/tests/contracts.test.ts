import { describe, expect, it } from "vitest";
import {
  authCredentialsSchema,
  authLoginResponseSchema,
  authMeResponseSchema,
  authRefreshResponseSchema,
  authRegisterResponseSchema,
  courseApprovalResponseSchema,
  courseDetailResponseSchema,
  courseListResponseSchema,
  courseSkillGraphResponseSchema,
  createCourseRequestSchema,
  createCourseResponseSchema,
  errorResponseSchema,
  generationAcceptedResponseSchema,
  generationJobResponseSchema,
  generationJobStatusSchema,
  generationRequestSchema,
  idempotencyKeySchema,
  learnerStateResponseSchema,
  lessonDetailResponseSchema,
  lessonListResponseSchema,
  nextActionResponseSchema,
  paginationQuerySchema,
  questionListResponseSchema,
  questionPublicSchema,
  submitAttemptRequestSchema,
  submitAttemptResponseSchema,
  utcTimestampSchema,
  uuidSchema,
} from "../dist/index.js";

const USER = "550e8400-e29b-41d4-a716-446655440010";
const COURSE = "550e8400-e29b-41d4-a716-446655440101";
const LESSON = "550e8400-e29b-41d4-a716-446655440201";
const MAPPING = "550e8400-e29b-41d4-a716-446655440301";
const SKILL = "550e8400-e29b-41d4-a716-446655440401";
const QUESTION = "550e8400-e29b-41d4-a716-446655440501";
const QUESTION_VERSION = "550e8400-e29b-41d4-a716-446655440502";
const ATTEMPT = "550e8400-e29b-41d4-a716-446655440601";
const POLICY = "550e8400-e29b-41d4-a716-446655440701";
const JOB = "550e8400-e29b-41d4-a716-446655440801";
const TIME = "2026-11-21T08:30:00.000Z";

const question = {
  id: QUESTION,
  questionVersionId: QUESTION_VERSION,
  versionNumber: 1,
  type: "single_choice",
  prompt: "Một Node chứa những gì?",
  options: [
    { id: "option-a", text: "Dữ liệu và next" },
    { id: "option-b", text: "Chỉ số" },
  ],
};

describe("common.ts – quy ước chung", () => {
  it("chỉ nhận UUID v4 đúng dạng", () => {
    expect(uuidSchema.safeParse(USER).success).toBe(true);
    expect(uuidSchema.safeParse("course-001").success).toBe(false);
    expect(uuidSchema.safeParse("550e8400-e29b-11d4-a716-446655440010").success).toBe(false);
  });

  it("Idempotency-Key phải là UUID v4", () => {
    expect(idempotencyKeySchema.safeParse(ATTEMPT).success).toBe(true);
    expect(idempotencyKeySchema.safeParse("attempt-123").success).toBe(false);
  });

  it("timestamp phải là UTC với 3 chữ số mili-giây", () => {
    expect(utcTimestampSchema.safeParse(TIME).success).toBe(true);
    expect(utcTimestampSchema.safeParse("2026-11-21T15:30:00+07:00").success).toBe(false);
    expect(utcTimestampSchema.safeParse("2026-11-21T08:30:00Z").success).toBe(false);
  });

  it("pagination có mặc định và giới hạn", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: "2", limit: "50" })).toEqual({ page: 2, limit: 50 });
    expect(paginationQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("error response bắt buộc code/message/details/requestId", () => {
    const error = {
      error: { code: "COURSE_NOT_FOUND", message: "Không tìm thấy khóa học", details: null, requestId: USER },
    };
    expect(errorResponseSchema.safeParse(error).success).toBe(true);
    expect(errorResponseSchema.safeParse({ ...error, stack: "secret" }).success).toBe(false);
    expect(errorResponseSchema.safeParse({ error: { ...error.error, password: "secret" } }).success).toBe(false);
  });
});

describe("auth.ts – không lộ dữ liệu nhạy cảm", () => {
  it("chấp nhận email hợp lệ và chuẩn hóa chữ thường", () => {
    const result = authCredentialsSchema.parse({ email: "  STUDENT@EXAMPLE.COM  ", password: "ExamplePassword123!" });
    expect(result.email).toBe("student@example.com");
  });

  it("không chấp nhận email lỗi hoặc mật khẩu ngắn", () => {
    expect(authCredentialsSchema.safeParse({ email: "bad", password: "ExamplePassword123!" }).success).toBe(false);
    expect(authCredentialsSchema.safeParse({ email: "student@example.com", password: "123" }).success).toBe(false);
  });

  it("giới hạn bcrypt theo 72 BYTE, không chỉ 72 ký tự", () => {
    expect(authCredentialsSchema.safeParse({ email: "student@example.com", password: "a".repeat(72) }).success).toBe(true);
    expect(authCredentialsSchema.safeParse({ email: "student@example.com", password: "á".repeat(40) }).success).toBe(false);
  });

  it("từ chối field ownerId/passwordHash/role từ request", () => {
    expect(authCredentialsSchema.safeParse({ email: "student@example.com", password: "ExamplePassword123!", role: "ADMIN" }).success).toBe(false);
  });

  it("AUTH-01 public user không chứa passwordHash", () => {
    const response = { data: { user: { id: USER, email: "student@example.com", createdAt: TIME } } };
    expect(authRegisterResponseSchema.safeParse(response).success).toBe(true);
    expect(authRegisterResponseSchema.safeParse({ data: { user: { ...response.data.user, passwordHash: "hash" } } }).success).toBe(false);
    expect(authMeResponseSchema.safeParse({ data: response.data.user }).success).toBe(true);
  });

  it("AUTH-02 login chỉ trả access token và user công khai", () => {
    const response = { data: { accessToken: "jwt", tokenType: "Bearer", expiresIn: 900, user: { id: USER, email: "student@example.com" } } };
    expect(authLoginResponseSchema.safeParse(response).success).toBe(true);
    expect(authLoginResponseSchema.safeParse({ data: { ...response.data, refreshToken: "secret" } }).success).toBe(false);
  });

  it("AUTH-03 refresh không có refreshToken trong JSON", () => {
    expect(authRefreshResponseSchema.safeParse({ data: { accessToken: "jwt2", tokenType: "Bearer", expiresIn: 900 } }).success).toBe(true);
    expect(authRefreshResponseSchema.safeParse({ data: { accessToken: "jwt2", tokenType: "Bearer", expiresIn: 900, refreshToken: "secret" } }).success).toBe(false);
  });
});

describe("course.ts – quyền sở hữu được xác định phía server", () => {
  it("chỉ nhận title và description khi tạo khóa học", () => {
    expect(createCourseRequestSchema.safeParse({ title: "Linked List" }).success).toBe(true);
    expect(createCourseRequestSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createCourseRequestSchema.safeParse({ title: "Linked List", ownerId: USER }).success).toBe(false);
    expect(createCourseRequestSchema.safeParse({ title: "Linked List", status: "ready" }).success).toBe(false);
  });

  it("COURSE-01 tạo draft; COURSE-03 description có thể null", () => {
    expect(createCourseResponseSchema.safeParse({ data: { id: COURSE, title: "Linked List", description: null, status: "draft", createdAt: TIME } }).success).toBe(true);
    expect(courseDetailResponseSchema.safeParse({ data: {
      id: COURSE, title: "Linked List", description: null, status: "ready", lessonCount: 3, createdAt: TIME, updatedAt: TIME,
    } }).success).toBe(true);
  });

  it("COURSE-02 danh sách có metadata phân trang", () => {
    expect(courseListResponseSchema.safeParse({
      data: [{ id: COURSE, title: "Linked List", status: "ready", createdAt: TIME }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }).success).toBe(true);
  });

  it("COURSE-04, COURSE-05 phân biệt lesson summary và detail", () => {
    const summary = { id: LESSON, courseId: COURSE, title: "Node", position: 1 };
    expect(lessonListResponseSchema.safeParse({ data: [summary] }).success).toBe(true);
    expect(lessonDetailResponseSchema.safeParse({ data: { ...summary, content: "Nội dung bài học" } }).success).toBe(true);
    expect(lessonListResponseSchema.safeParse({ data: [{ ...summary, content: "Không được trả ở danh sách" }] }).success).toBe(false);
  });
});

describe("knowledge.ts – graph KC", () => {
  it("KC-01 có mapping version, skill và cạnh tiên quyết", () => {
    expect(courseSkillGraphResponseSchema.safeParse({ data: {
      courseId: COURSE, mappingVersionId: MAPPING, mappingVersionNumber: 1,
      skills: [{ id: SKILL, skillKey: "KC-01", name: "Node & Pointer" }],
      prerequisites: [],
    } }).success).toBe(true);
  });

  it("không chấp nhận thiếu mappingVersionId", () => {
    expect(courseSkillGraphResponseSchema.safeParse({ data: {
      courseId: COURSE, mappingVersionNumber: 1,
      skills: [], prerequisites: [],
    } }).success).toBe(false);
  });
  // DAG cycle, cross-course, approved version: TEST ở Backend/Algorithms, không ở đây.
});

describe("quiz.ts – không tiết lộ đáp án", () => {
  it("QUIZ-01 public question không có answerKey", () => {
    expect(questionPublicSchema.safeParse(question).success).toBe(true);
    expect(questionListResponseSchema.safeParse({ data: [question] }).success).toBe(true);
    expect(questionPublicSchema.safeParse({ ...question, answerKey: "option-a" }).success).toBe(false);
    expect(questionPublicSchema.safeParse({ ...question, explanation: "Đáp án A" }).success).toBe(false);
  });

  it("câu hỏi phải có tối thiểu 2 lựa chọn và ID option không trùng", () => {
    expect(questionPublicSchema.safeParse({ ...question, options: [question.options[0]] }).success).toBe(false);
    expect(questionPublicSchema.safeParse({ ...question, options: [question.options[0], question.options[0]] }).success).toBe(false);
  });

  it("QUIZ-02 input chỉ có questionVersionId và selectedOptionId", () => {
    const body = { questionVersionId: QUESTION_VERSION, selectedOptionId: "option-b" };
    expect(submitAttemptRequestSchema.safeParse(body).success).toBe(true);
    expect(submitAttemptRequestSchema.safeParse({ ...body, isCorrect: true }).success).toBe(false);
    expect(submitAttemptRequestSchema.safeParse({ ...body, hintsUsed: 0 }).success).toBe(false);
    expect(submitAttemptRequestSchema.safeParse({ ...body, userId: USER }).success).toBe(false);
    expect(submitAttemptRequestSchema.safeParse({ ...body, skillId: SKILL }).success).toBe(false);
  });

  it("QUIZ-02 response có bằng chứng phiên bản và mastery status hợp lệ", () => {
    const result = { attemptId: ATTEMPT, questionId: QUESTION, questionVersionId: QUESTION_VERSION,
      isCorrect: false, feedback: "Ôn lại Node", skill: { id: SKILL, skillKey: "KC-01", name: "Node" },
      masteryStatus: "insufficient_data", submittedAt: TIME };
    expect(submitAttemptResponseSchema.safeParse({ data: result }).success).toBe(true);
    expect(submitAttemptResponseSchema.safeParse({ data: { ...result, masteryStatus: "passed" } }).success).toBe(false);
  });
});

describe("learning.ts – trạng thái và adaptive policy", () => {
  it("LEARN-01 model MVP chỉ rule_based", () => {
    const state = { courseId: COURSE, modelType: "rule_based", modelVersion: "rule-v1", skills: [
      { skillId: SKILL, skillKey: "KC-01", name: "Node", status: "learning", updatedAt: TIME },
    ] };
    expect(learnerStateResponseSchema.safeParse({ data: state }).success).toBe(true);
    expect(learnerStateResponseSchema.safeParse({ data: { ...state, modelType: "bkt" } }).success).toBe(false);
  });

  it("ADAPT-01 trả data null nếu chưa có gợi ý", () => {
    expect(nextActionResponseSchema.safeParse({ data: null }).success).toBe(true);
  });

  it("ADAPT-01 targetSkillId có thể null", () => {
    const policy = { id: POLICY, courseId: COURSE, action: "continue_learning", targetSkillId: null,
      reasonCode: "NO_WEAK_SKILL", message: "Tiếp tục học", policyVersion: "adaptive-v1", createdAt: TIME };
    expect(nextActionResponseSchema.safeParse({ data: policy }).success).toBe(true);
    expect(nextActionResponseSchema.safeParse({ data: { ...policy, action: "invented_action" } }).success).toBe(false);
  });
});

describe("generation.ts – job khác trạng thái Course", () => {
  it("GEN-01 bắt buộc level hợp lệ và lessonCount từ 1 đến 20", () => {
    const request = { learningGoal: "Học Linked List", targetLevel: "beginner", lessonCount: 3 };
    expect(generationRequestSchema.safeParse(request).success).toBe(true);
    expect(generationRequestSchema.safeParse({ ...request, targetLevel: "expert" }).success).toBe(false);
    expect(generationRequestSchema.safeParse({ ...request, lessonCount: 21 }).success).toBe(false);
  });

  it("JobStatus không có giá trị ready của CourseStatus", () => {
    expect(generationJobStatusSchema.safeParse("queued").success).toBe(true);
    expect(generationJobStatusSchema.safeParse("ready").success).toBe(false);
  });

  it("GEN-01 accepted có jobStatus queued, courseStatus generating", () => {
    expect(generationAcceptedResponseSchema.safeParse({ data: {
      courseId: COURSE, jobId: JOB, jobStatus: "queued", courseStatus: "generating",
    } }).success).toBe(true);
  });

  it("GEN-02 khi chưa hoàn thành có thể chưa có finishedAt", () => {
    expect(generationJobResponseSchema.safeParse({ data: {
      jobId: JOB, courseId: COURSE, status: "running", progress: null,
    } }).success).toBe(true);
    expect(generationJobResponseSchema.safeParse({ data: {
      jobId: JOB, courseId: COURSE, status: "succeeded", progress: 100, finishedAt: TIME,
    } }).success).toBe(true);
  });

  it("GEN-03 chỉ approve thành ready", () => {
    expect(courseApprovalResponseSchema.safeParse({ data: {
      courseId: COURSE, status: "ready", approvedMappingVersionId: MAPPING,
    } }).success).toBe(true);
    expect(courseApprovalResponseSchema.safeParse({ data: {
      courseId: COURSE, status: "draft", approvedMappingVersionId: MAPPING,
    } }).success).toBe(false);
  });
});
