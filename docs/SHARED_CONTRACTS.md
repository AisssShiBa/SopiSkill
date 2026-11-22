# SopiSkill – Shared DTO & Zod Contracts

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản thiết kế | **1.0.0** |
| Trạng thái | **DRAFT FOR REVIEW – chưa phải code được triển khai** |
| Ngày | 21/11/2026 |
| Người quản lý | Project Leader / Technical Lead |
| Phạm vi | DTO/Zod cho MVP: Auth, Course, Lesson, KC, Quiz, Learning State, Adaptive, AI Generation Jobs |
| Tài liệu nguồn | `docs/DATA_CONTRACTS.md`, `docs/ERD.md` v1.0, `docs/API_CONTRACTS.md` v1.0 |
| Công nghệ đã chọn | TypeScript, React/Vite, Express, PostgreSQL/Prisma, npm workspaces, Zod 4 |

> **Giới hạn:** Đây là bản **thiết kế hợp đồng và mã TypeScript minh họa**, chưa được cài vào dự án. Không tạo bảng Prisma, API Express, worker, thuật toán hay giao diện ở bước này. Tên trường được đối chiếu từ tài liệu API/ERD hiện có; đề xuất sửa mâu thuẫn được ghi riêng ở mục 9.

## 1. Vì sao cần `packages/shared`?

Ba thành phần sau cần thống nhất một hợp đồng:

- **Frontend** biết kiểu request/response để dựng form, xử lý kết quả và hiển thị lỗi.
- **Backend** validate dữ liệu do client gửi; tuyệt đối không tin `userId`, `isCorrect`, `answerKey` từ client.
- **AI/Algorithms** dựa trên các enum/kiểu dữ liệu nghiệp vụ công khai, nhưng thuật toán nội bộ không phải nằm trong Shared.

**Phân biệt:**

- **DTO (Data Transfer Object):** dữ liệu đi qua ranh giới API; không đồng nhất với bảng database.
- **TypeScript type:** giúp IDE/compiler phát hiện lỗi lúc viết code; **không** kiểm tra JSON thực tế qua mạng.
- **Zod schema:** kiểm tra/chuẩn hóa dữ liệu tại runtime, cho cả input từ client và output từ LLM khi đến bước triển khai.

**Nguyên tắc bất biến:** Không export `User.passwordHash`, `QuestionVersion.answerKey`, refresh token hoặc Prisma entity nguyên trạng sang frontend. Shared chỉ chứa những hợp đồng **an toàn để phía client import**.

## 2. Cấu trúc package được đề xuất (chưa cần tạo lúc này)

```text
SopiSkill/
├── frontend/
├── backend/
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── common.ts
│   │       ├── auth.ts
│   │       ├── course.ts
│   │       ├── knowledge.ts
│   │       ├── quiz.ts
│   │       ├── learning.ts
│   │       └── generation.ts
│   ├── db/              # Prisma (sau khi duyệt ERD)
│   ├── algorithms/      # Thuật toán riêng, không nằm trong shared
│   └── ai/              # Provider adapter riêng
└── docs/
    ├── DATA_CONTRACTS.md
    ├── ERD.md
    ├── API_CONTRACTS.md
    └── SHARED_CONTRACTS.md   # Tài liệu này
```

Tên package tương lai: **`@sopiskill/shared`**. `frontend` và `backend` cùng phụ thuộc package này bằng npm workspaces; `shared` **không** phụ thuộc `frontend`, `backend`, Express, Prisma hoặc Node.js API.

## 3. Quy chuẩn DTO/Zod đã thống nhất

| Nội dung | Quy tắc |
|---|---|
| TypeScript/JSON | `camelCase` |
| Schema/type | `PascalCase`; biến schema dạng `createCourseRequestSchema` |
| ID | UUID v4, truyền trên wire dưới dạng `string` |
| Ngày giờ | Chuỗi ISO 8601 **UTC**, ví dụ `2026-11-21T08:30:00.000Z` |
| API | Prefix `/api/v1` |
| Success | `{ "data": ... }`; danh sách có thể có `meta` |
| Error | `{ "error": { "code", "message", "details", "requestId" } }` |
| Pagination | `page >= 1`, `limit = 1..100`, mặc định `1/20` |
| Input object | Schema **strict**, từ chối field lạ thay vì silently nhận `ownerId`, `isCorrect`... |
| DTO công khai | Không có `passwordHash`, `answerKey`, thông tin nội bộ của provider |
| Versioning | Dùng `questionVersionId` và `mappingVersionId` đúng ngữ cảnh |
| Response date | Backend serialize thành string UTC trước khi trả JSON |

> Kiểm tra `z.uuid({ version: "v4" })`, `z.iso.datetime({ precision: 3 })`, `z.strictObject(...)` minh họa cho **Zod 4**. Giá trị `precision: 3` biểu diễn timestamp có 3 chữ số mili-giây; nếu nhóm cần độ chính xác khác, thay đổi tài liệu nhất quán trước khi code.

### 3.1. Ví dụ `common.ts` (chưa triển khai)

```ts
import * as z from "zod";

export const uuidSchema = z.uuid({ version: "v4" });
export const utcTimestampSchema = z.iso.datetime({ precision: 3 });

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().nullable(),
    requestId: uuidSchema,
  }),
});

export const paginationMetaSchema = z.strictObject({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type ApiErrorResponse = z.infer<typeof errorResponseSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
```

**Lý do:** Một định nghĩa kiểu dùng chung, ít khả năng mỗi module tự invent thêm `success`, `statusCode` hoặc format lỗi khác.

**Giới hạn:** Không cố bắt toàn bộ HTTP response (204, SSE, upload) đều phải là JSON; quy định response theo từng endpoint.

## 4. Auth DTO: hợp đồng công khai, tuyệt đối không có `passwordHash`

**Tham chiếu:** AUTH-01 đến AUTH-05 trong `API_CONTRACTS.md`.

```ts
import * as z from "zod";
import { uuidSchema, utcTimestampSchema } from "./common";

export const userPublicSchema = z.strictObject({
  id: uuidSchema,
  email: z.email(),
  createdAt: utcTimestampSchema,
});

export const authCredentialsSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).max(72),
});

export const authCredentialsResponseSchema = z.strictObject({
  data: z.strictObject({
    accessToken: z.string().min(1),
    tokenType: z.literal("Bearer"),
    expiresIn: z.number().int().positive(),
    user: z.strictObject({
      id: uuidSchema,
      email: z.email(),
    }),
  }),
});

export type UserPublicDTO = z.infer<typeof userPublicSchema>;
export type AuthCredentialsDTO = z.infer<typeof authCredentialsSchema>;
```

**Quan trọng trước khi lập trình:** `bcryptjs` giới hạn đầu vào theo **72 byte**, không phải 72 ký tự Unicode. `.max(72)` bên trên là ví dụ giới hạn ký tự **chưa đủ làm chính sách bảo mật cuối cùng**. Khi triển khai, backend phải xác thực số byte UTF-8 (ví dụ bằng `Buffer.byteLength(password, "utf8")` hoặc phép đếm tương đương), áp dụng chính sách password nhất quán và tránh cắt ngầm mật khẩu.

**Ranh giới:** `password` chỉ là trường **request**; không được đưa vào response, log hoặc Redux/query cache. Refresh token là **HttpOnly Cookie**, không nằm trong JSON `data`. `AUTH-03` trả access token và metadata mới; `AUTH-04` trả HTTP 204, không có body.

## 5. Course & Lesson DTO

**Tham chiếu:** COURSE-01 → COURSE-05.

```ts
import * as z from "zod";
import { uuidSchema, utcTimestampSchema } from "./common";

export const courseStatusSchema = z.enum([
  "draft", "awaiting_approval", "generating",
  "ready", "failed", "archived",
]);

export const createCourseRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const courseDetailSchema = z.strictObject({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: courseStatusSchema,
  lessonCount: z.number().int().min(0),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
});

export const lessonSummarySchema = z.strictObject({
  id: uuidSchema,
  courseId: uuidSchema,
  title: z.string(),
  position: z.number().int().min(1),
});

export const lessonDetailSchema = lessonSummarySchema.extend({
  content: z.string(),
});

export type CourseStatus = z.infer<typeof courseStatusSchema>;
export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type CourseDetailDTO = z.infer<typeof courseDetailSchema>;
```

**Ghi chú nhất quán:** `description` là tùy chọn trong CREATE nhưng thiết kế GET cần chọn **một** cách biểu diễn khi không có nội dung. Ở đây đề xuất **`null`** khi trả `CourseDetail`. Cần cập nhật `API_CONTRACTS.md` để thể hiện nhất quán, vì ví dụ hiện tại chỉ có chuỗi.

**Không nhận từ client:** `ownerId`, `id`, `createdAt`, `status=ready`, `lessonCount`. Các giá trị này do backend kiểm soát.

## 6. Knowledge Components (KC) DTO

**Tham chiếu:** KC-01, `Skill`, `SkillPrerequisite`, `SkillMappingVersion` và `QuestionSkill` trong ERD.

```ts
import * as z from "zod";
import { uuidSchema } from "./common";

export const skillPublicSchema = z.strictObject({
  id: uuidSchema,
  skillKey: z.string().min(1),
  name: z.string().min(1),
});

export const prerequisiteEdgeSchema = z.strictObject({
  skillId: uuidSchema,
  prerequisiteSkillId: uuidSchema,
});

export const courseSkillGraphSchema = z.strictObject({
  courseId: uuidSchema,
  mappingVersionId: uuidSchema,
  mappingVersionNumber: z.number().int().min(1),
  skills: z.array(skillPublicSchema),
  prerequisites: z.array(prerequisiteEdgeSchema),
});

export type SkillPublicDTO = z.infer<typeof skillPublicSchema>;
export type CourseSkillGraphDTO = z.infer<typeof courseSkillGraphSchema>;
```

Zod chỉ xác thực **hình dạng dữ liệu**. Những quy tắc sau thuộc **Backend/Algorithms**, không thể coi là đã kiểm tra chỉ vì JSON hợp schema:

- `skillId` và `prerequisiteSkillId` thuộc cùng Course.
- Không có self-loop, duplicate edge hoặc chu trình (dùng DFS/Kahn).
- Mapping Version phải được duyệt trước khi hiển thị Graph đang sử dụng.
- Một `QuestionVersion` có **đúng một KC chính** trong Mapping Version approved.
- Không ghi đè mapping version đã được dùng để đánh giá.

Frontend chỉ nhận Graph đã công bố; không tự duyệt Graph bằng dữ liệu từ client.

## 7. Quiz & Learning Evidence DTO

**Tham chiếu:** QUIZ-01, QUIZ-02, `QuestionVersion`, `QuizAttempt`, `LearningEvent` trong ERD.

```ts
import * as z from "zod";
import { uuidSchema, utcTimestampSchema } from "./common";

export const optionPublicSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const questionPublicSchema = z.strictObject({
  id: uuidSchema,
  questionVersionId: uuidSchema,
  versionNumber: z.number().int().min(1),
  type: z.literal("single_choice"),
  prompt: z.string().min(1),
  options: z.array(optionPublicSchema).min(2),
});

export const submitAttemptRequestSchema = z.strictObject({
  questionVersionId: uuidSchema,
  selectedOptionId: z.string().min(1),
});

export const masteryStatusSchema = z.enum([
  "insufficient_data", "learning", "proficient", "needs_review",
]);

export const submitAttemptResultSchema = z.strictObject({
  attemptId: uuidSchema,
  questionId: uuidSchema,
  questionVersionId: uuidSchema,
  isCorrect: z.boolean(),
  feedback: z.string(),
  skill: z.strictObject({
    id: uuidSchema,
    skillKey: z.string(),
    name: z.string(),
  }),
  masteryStatus: masteryStatusSchema,
  submittedAt: utcTimestampSchema,
});

export type QuestionPublicDTO = z.infer<typeof questionPublicSchema>;
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;
export type SubmitAttemptResult = z.infer<typeof submitAttemptResultSchema>;
```

**Không bao giờ có trong `questionPublicSchema`:** `answerKey`, `isCorrect`, `explanation` trước khi nộp, đáp án bí mật hoặc metadata dùng để tiết lộ lời giải.

**Quy tắc submit:**

- `questionId` là UUID ở **URL path**; `questionVersionId` thuộc **JSON body**; backend phải đối chiếu chúng.
- Header `Idempotency-Key` là UUID v4, được validate **tách khỏi body**; retry cùng key và cùng payload không tạo lượt nộp mới.
- Client **không** gửi `userId`, `skillId`, `mappingVersionId`, `isCorrect`, `hintsUsed`.
- Backend tính và snapshot kết quả vào `QuizAttempt`/`LearningEvent`, cùng các version hợp lệ.
- JSON parse thành công **chưa chứng minh** option thuộc câu hỏi, học viên có quyền, đáp án đúng hoặc mapping đã duyệt.

**Điểm ERD cần hiệu chỉnh:** `API_CONTRACTS.md` công bố `Question.type = "single_choice"` trong danh sách câu hỏi, nhưng ERD hiện tại chưa có trường `type` trong `QuestionVersion`. Đề xuất bổ sung `type: QuestionType` vào `QuestionVersion` trước khi viết Prisma.

## 8. Learner State, Adaptive & Generation DTO

**Tham chiếu:** LEARN-01, ADAPT-01, GEN-01 → GEN-03.

```ts
import * as z from "zod";
import { uuidSchema, utcTimestampSchema } from "./common";
import { masteryStatusSchema } from "./quiz";

export const learnerSkillItemSchema = z.strictObject({
  skillId: uuidSchema,
  skillKey: z.string(),
  name: z.string(),
  status: masteryStatusSchema,
  updatedAt: utcTimestampSchema,
});

export const learnerStateSchema = z.strictObject({
  courseId: uuidSchema,
  modelType: z.literal("rule_based"),
  modelVersion: z.string().min(1),
  skills: z.array(learnerSkillItemSchema),
});

export const policyActionSchema = z.enum([
  "review_skill", "practice_skill", "next_lesson",
  "mini_pretest", "continue_learning",
]);

export const policyDecisionSchema = z.strictObject({
  id: uuidSchema,
  courseId: uuidSchema,
  action: policyActionSchema,
  targetSkillId: uuidSchema.nullable(),
  reasonCode: z.string().min(1),
  message: z.string(),
  policyVersion: z.string().min(1),
  createdAt: utcTimestampSchema,
});

export const generationRequestSchema = z.strictObject({
  learningGoal: z.string().trim().min(1),
  targetLevel: z.literal("beginner"), // tạm thời theo ví dụ, mở rộng enum khi chốt
  lessonCount: z.number().int().min(1).max(20),
});

export const generationJobStatusSchema = z.enum([
  "queued", "running", "succeeded", "failed", "cancelled",
]);

export type LearnerStateDTO = z.infer<typeof learnerStateSchema>;
export type PolicyDecisionDTO = z.infer<typeof policyDecisionSchema>;
export type GenerationRequest = z.infer<typeof generationRequestSchema>;
```

**Cần phân biệt:**

- `MasteryStatus` là trạng thái của **Skill** chứ không phải trạng thái job.
- `CourseStatus` khác `GenerationJobStatus`.
- `GET /next-action` **không ghi** PolicyDecision mới; `data` có thể là `null`.
- `PolicyDecision.reasonCode` do chính sách quyết định, không phải do LLM suy đoán.
- `modelType = "rule_based"` trong MVP; không trả xác suất BKT như thể hệ thống đã huấn luyện và dùng BKT production.
- `targetLevel` chưa được định nghĩa thành enum nghiệp vụ trong ERD/API; ví dụ ở đây chỉ chấp nhận `beginner`, **phải chốt các giá trị hợp lệ** trước khi code GEN-01.

## 9. Bảng ánh xạ 18 endpoint sang DTO/Zod

| Contract ID | Endpoint | Request/Query cần schema | Response cần schema | Ghi chú |
|---|---|---|---|---|
| AUTH-01 | `POST /auth/register` | `AuthCredentials` | `{data:{user:UserPublicDTO}}` | Không trả password/hash |
| AUTH-02 | `POST /auth/login` | `AuthCredentials` | `AuthLoginResponse` | Cookie refresh chỉ ở HTTP Set-Cookie |
| AUTH-03 | `POST /auth/refresh` | Cookie/CSRF | `AuthRefreshResponse` | Không có refresh token trong JSON |
| AUTH-04 | `POST /auth/logout` | Cookie/CSRF | Không body (204) | Không tạo JSON rỗng |
| AUTH-05 | `GET /auth/me` | Bearer token | `{data:UserPublicDTO}` | JWT validated server-side |
| COURSE-01 | `POST /courses` | `CreateCourseRequest` | `CreateCourseResponse` | Status `draft` |
| COURSE-02 | `GET /courses` | `PaginationQuery` | `PaginatedCourseList` | Mặc định 1/20, tối đa 100 |
| COURSE-03 | `GET /courses/:courseId` | UUID path | `CourseDetailResponse` | Owner only |
| COURSE-04 | `GET /courses/:courseId/lessons` | UUID path | `LessonSummary[]` | Sắp xếp position |
| COURSE-05 | `GET /lessons/:lessonId` | UUID path | `LessonDetail` | Owner via Course |
| KC-01 | `GET /courses/:courseId/skills` | UUID path | `CourseSkillGraph` | Chỉ approved mapping |
| QUIZ-01 | `GET /lessons/:lessonId/questions` | UUID path | `QuestionPublic[]` | Tuyệt đối không answerKey |
| QUIZ-02 | `POST /questions/:questionId/attempts` | UUID path, Header key, `SubmitAttemptRequest` | `SubmitAttemptResult` | Transaction + idempotency |
| LEARN-01 | `GET /courses/:courseId/learner-state` | UUID path | `LearnerState` | Không tự nhận userId từ client |
| ADAPT-01 | `GET /courses/:courseId/next-action` | UUID path | `PolicyDecision | null` | Read-only |
| GEN-01 | `POST /courses/:courseId/generations` | UUID path, Header key, `GenerationRequest` | `GenerationAccepted` | 202 Accepted |
| GEN-02 | `GET /jobs/:jobId` | UUID path | `GenerationJobPublic` | Owner only |
| GEN-03 | `POST /courses/:courseId/approve` | UUID path; body không bắt buộc | `CourseApprovalResult` | Validator + state transition |

**Ghi chú:** Một số schema response trong bảng là **tên hợp đồng cần tạo khi thực hiện**, không phải tất cả đã được viết trong các đoạn minh họa trên. API JSON thực tế luôn bọc trường `data` và có thể có `meta` đúng quy tắc `API_CONTRACTS.md`.

## 10. Điểm còn phải đồng bộ trước Prisma / lập trình

Dựa trên đối chiếu **tài liệu ERD/API hiện có**, đây là các điểm phải được giải quyết minh bạch, không nên tự sửa ngầm:

1. **Question type:** Bổ sung `QuestionVersion.type` (ví dụ `single_choice`) vào `ERD.md`, do `QUIZ-01` có trả trường `type`.
2. **Course description:** Ở request `POST /courses` có thể optional; ở `GET /courses/:id` chọn trả **`null` nếu không có mô tả**. Ghi rõ trong cả API và schema.
3. **Password length:** Thêm quy tắc validation theo **byte UTF-8**, không chỉ số ký tự, vì bcrypt giới hạn 72 byte.
4. **Generation target level:** Chốt enum `beginner`/`intermediate`/`advanced` (hoặc danh sách khác được nhóm chọn), tránh `targetLevel` string tùy ý.
5. **Question version outdated:** Chốt trả `409 QUESTION_VERSION_OUTDATED` nếu version hiển thị không còn hợp lệ lúc nộp; tài liệu API hiện để thành quyết định trước triển khai.
6. **Question option IDs:** Chọn ID option là string chỉ ổn định trong QuestionVersion; không bắt buộc UUID vì hợp đồng hiện ví dụ `option-b`.
7. **Auth metadata:** ERD 13 bảng chưa có `RefreshSession`, cần thiết kế trước khi code Auth thật.
8. **Generation metadata:** Cần thiết kế bảng Job/GenerationRun trước khi code GEN-01 thật; job BullMQ không tự thay thế lịch sử nghiệp vụ bền vững.
9. **Policy decision trigger:** Chốt policy được ghi sau chấm đồng bộ hay qua job; `GET /next-action` chỉ đọc theo hợp đồng hiện có.
10. **UUID examples:** Các ví dụ JSON trong tài liệu có UUID phù hợp; khi tạo mock/test cần dùng UUID v4 đúng dạng, không sử dụng `course-001` trong DTO đã validate.

## 11. Kế hoạch kiểm thử hợp đồng (chưa viết test)

| Test | Kỳ vọng |
|---|---|
| `createCourseRequestSchema` | Thiếu title → fail; `ownerId` từ client → fail |
| `userPublicSchema` | Có `passwordHash` → fail (schema strict) |
| `questionPublicSchema` | Có `answerKey` → fail |
| `submitAttemptRequestSchema` | Có `isCorrect` hoặc `hintsUsed` → fail |
| `uuidSchema` | Không chấp nhận ID không đúng UUID v4 |
| `utcTimestampSchema` | Không chấp nhận timestamp thiếu timezone UTC / precision không đúng |
| `courseSkillGraphSchema` | Check shape OK, **nhưng** DAG cycle vẫn phải qua validator riêng |
| `learnerStateSchema` | Không chấp nhận mastery status ngoài enum |
| `policyDecisionSchema` | `targetSkillId` có thể null |
| `generationJobStatusSchema` | Không cho lẫn `ready` (CourseStatus) vào JobStatus |
| API error mapper | Trả `error.code`, `message`, `details`, `requestId`, không lộ secret |
| Quiz retry | Cùng Idempotency-Key + payload → tối đa 1 LearningEvent (integration test) |

**Chú ý:** Schema `z.strictObject()` là công cụ runtime để kiểm soát shape, không thay thế authorization, DB unique constraints, transaction, validation graph hay kiểm chứng nội dung do LLM tạo.

## 12. Vai trò của 3 thành viên khi review

| Vai trò | Nội dung kiểm tra |
|---|---|
| Leader/Backend | Field input không tin client; response wrappers; UUID; authorization; contract với Prisma |
| Frontend | Có đủ field cho UI, trạng thái loading/empty/error; tên field nhất quán; không phụ thuộc DTO nội bộ |
| AI/Algorithms | KC/version/QuizAttempt/LearningEvent; policy reasonCode; schema LLM tách khỏi DTO công khai |

### Definition of Done – Shared Contracts Design

- [ ] Danh sách DTO tương ứng đầy đủ 18 endpoint thiết kế.
- [ ] Các input quan trọng dùng schema strict; response không lộ dữ liệu nhạy cảm.
- [ ] Đối chiếu `API_CONTRACTS.md` / `ERD.md` và ghi rõ mọi điểm khác biệt.
- [ ] Các enum Course/Mastery/Job/Policy không trộn lẫn.
- [ ] Đã chốt cách dùng `questionVersionId`, `mappingVersionId` và `Idempotency-Key`.
- [ ] Không để `frontend` import Prisma Model, backend service, answer key hoặc JWT secret.
- [ ] Có kế hoạch test shape, quyền sở hữu và tính toàn vẹn qua đúng lớp phụ trách.
- [ ] Cả 3 thành viên đã review; Leader ghi `APPROVED` khi thống nhất.

## 13. Các bước tiếp theo sau khi duyệt tài liệu

1. Lưu tài liệu này vào `D:\SopiSkill\docs\SHARED_CONTRACTS.md`.
2. Review 10 điểm phải đồng bộ ở mục 10; cập nhật `ERD.md` / `API_CONTRACTS.md` cùng một lần.
3. Khi nhóm sẵn sàng **cài đặt package**, tạo `packages/shared` bằng npm workspaces, cài đúng `zod` cho workspace đó rồi chuyển các đoạn schema được phê duyệt thành source.
4. Viết test Zod nhỏ trước; sau đó mới chuyển ERD thành `schema.prisma` và API Express theo từng module.
5. Khi sửa một hợp đồng công khai, Pull Request phải cập nhật tài liệu + schema + test liên quan.

---

**Trạng thái cuối:** DRAFT FOR REVIEW. Không suy diễn tài liệu này là package đã chạy hoặc bộ test đã thành công. Nếu Leader muốn phê duyệt, cập nhật phần status sau khi đã giải quyết các điểm ở mục 10 và review cùng nhóm.
