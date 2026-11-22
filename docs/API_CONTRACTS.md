# SopiSkill – API Contracts v1.0

| Thuộc tính | Giá trị |
|---|---|
| Phiên bản tài liệu | **1.0.0 – đề xuất phê duyệt** |
| Trạng thái | **DRAFT FOR REVIEW** (chưa phải API đã lập trình) |
| Ngày | 21/11/2026 |
| Người quản lý | Project Leader / Technical Lead |
| Phạm vi | MVP 4 tuần: Auth, Course, Lesson, Quiz, KC Graph, Learning State, Adaptive Policy; AI Generation qua worker |
| Tài liệu gốc | `docs/DATA_CONTRACTS.md`, `docs/ERD.md`, `docs/ARCHITECTURE.md` |
| Stack | React + Vite + Axios; Express + TypeScript; PostgreSQL + Prisma; BullMQ + Redis; npm workspaces |

> **Mục đích:** Đây là **hợp đồng thiết kế**, không phải source code API. Frontend có thể dùng JSON ví dụ để dựng UI/mock; Backend dựa vào đây để triển khai; AI/Algorithms dựa vào đây để biết đầu vào/đầu ra. Không cài package hay tạo Prisma migrations từ tài liệu này.
>
> **Quy tắc phạm vi:** 13 thực thể trong `ERD.md` là lõi. `RefreshSession`, metadata AI Generation Job và Tutor Conversation **chưa nằm trong 13 thực thể**, phải bổ sung thiết kế dữ liệu tương ứng trước khi code các luồng đó.

---

## 1. Quy ước chung

### 1.1. API base và dữ liệu

- Base path: **`/api/v1`**.
- JSON fields: `camelCase`; tên kiểu TypeScript: `PascalCase`.
- ID thực thể: **UUID v4**; ví dụ `550e8400-e29b-41d4-a716-446655440000`.
- Timestamp: chuỗi **ISO 8601 UTC**, ví dụ `2026-11-21T08:30:00.000Z`.
- Client **không được gửi `userId` để tự xác định danh tính** trên các endpoint yêu cầu đăng nhập. Backend lấy user từ Access Token.
- Mọi dữ liệu người dùng, tham số URL, JSON từ LLM được validate server-side.
- Nội dung ví dụ (`title`, ID, skill, câu hỏi, v.v.) là **dữ liệu giả lập cho thiết kế**, không phải dữ liệu đang tồn tại trong PostgreSQL.

### 1.2. Headers và Authentication

| Header/cookie | Dùng khi nào | Quy định |
|---|---|---|
| `Authorization: Bearer <accessToken>` | Endpoint bảo vệ | JWT access token sống ngắn, phía React giữ trong memory |
| `Content-Type: application/json` | Request có JSON body | Trừ upload/stream |
| `Idempotency-Key: <uuid-v4>` | Submit Quiz, gửi tác vụ AI | Một khóa cho **một thao tác logic**; retry giữ nguyên khóa |
| HttpOnly Refresh Cookie | `POST /auth/refresh`, `/auth/logout` | Browser gửi cookie; token không đọc qua JS |
| `X-Request-ID` | Tùy chọn khi gửi | Backend tạo/chuẩn hóa request ID để đối chiếu log |

**Auth policy được chọn:** `jsonwebtoken` + `bcryptjs`; Access Token trong memory; Refresh Token trong HttpOnly cookie. Session/rotation/revocation phải được thiết kế riêng trước khi triển khai Auth. Khi dùng cookie cần cấu hình `SameSite`, `Secure`, CORS, CSRF phù hợp môi trường thật; CORS không phải biện pháp chống CSRF.

### 1.3. Response thành công

**Tài nguyên đơn:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Cấu trúc dữ liệu C++"
  }
}
```

**Danh sách có phân trang:**

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

`page` mặc định **1**; `limit` mặc định **20**, tối đa **100**; sắp xếp mặc định mới nhất trước, phá hòa bằng ID. Không dùng pagination cho graph KC trừ khi có thay đổi contract riêng. `204 No Content` **không có JSON body**.

### 1.4. Response lỗi

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Không tìm thấy khóa học",
    "details": null,
    "requestId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

`error.code` là mã máy đọc được, ổn định; `message` để hiển thị; `details` đã lọc thông tin nhạy cảm; `requestId` phục vụ truy log. Không xuất stack trace, JWT, hash mật khẩu, SQL hoặc prompt nội bộ ra client.

| HTTP | Dùng cho |
|---|---|
| `200` | Đọc hoặc xử lý thành công |
| `201` | Tạo thực thể/lượt nộp thành công |
| `202` | Yêu cầu bất đồng bộ đã được nhận |
| `204` | Thành công, không trả nội dung |
| `400` | Dữ liệu/cú pháp request không hợp lệ |
| `401` | Chưa xác thực/access token sai/hết hạn |
| `403` | Không có quyền thao tác |
| `404` | Tài nguyên không tồn tại **hoặc** không được phép tiết lộ sự tồn tại |
| `409` | Request trùng không tương thích, xung đột trạng thái |
| `422` | Không đáp ứng ràng buộc nghiệp vụ |
| `429` | Rate limit |
| `500` | Lỗi server |
| `503` | Phụ thuộc thiết yếu không sẵn sàng |

**Validation:** API mô tả những field bắt buộc và chỉ nhận field công khai đã quy định. Không để JSON tùy ý quyết định cột DB, course owner, `isCorrect`, `skillId` của evidence, v.v.

---

## 2. Danh mục endpoint theo mức ưu tiên

### 2.1. MVP bắt buộc

| ID | Method | Endpoint | Auth | Response | Mục đích |
|---|---|---|---|---|---|
| AUTH-01 | POST | `/auth/register` | Không | 201 | Đăng ký |
| AUTH-02 | POST | `/auth/login` | Không | 200 + cookie | Đăng nhập |
| AUTH-03 | POST | `/auth/refresh` | Cookie | 200 + cookie | Refresh/rotate phiên |
| AUTH-04 | POST | `/auth/logout` | Cookie | 204 | Thu hồi refresh session |
| AUTH-05 | GET | `/auth/me` | Bearer | 200 | Người dùng hiện tại |
| COURSE-01 | POST | `/courses` | Bearer | 201 | Tạo bản nháp khóa học |
| COURSE-02 | GET | `/courses` | Bearer | 200 | Liệt kê khóa học của mình |
| COURSE-03 | GET | `/courses/:courseId` | Bearer | 200 | Chi tiết course |
| COURSE-04 | GET | `/courses/:courseId/lessons` | Bearer | 200 | Danh sách lesson |
| COURSE-05 | GET | `/lessons/:lessonId` | Bearer | 200 | Nội dung lesson |
| KC-01 | GET | `/courses/:courseId/skills` | Bearer | 200 | Graph KC hiện hành |
| QUIZ-01 | GET | `/lessons/:lessonId/questions` | Bearer | 200 | Câu hỏi công khai, không đáp án |
| QUIZ-02 | POST | `/questions/:questionId/attempts` | Bearer + Idempotency-Key | 201 (hoặc 200 khi retry) | Nộp một câu và chấm server-side |
| LEARN-01 | GET | `/courses/:courseId/learner-state` | Bearer | 200 | Trạng thái các KC |
| ADAPT-01 | GET | `/courses/:courseId/next-action` | Bearer | 200 | Đọc quyết định gợi ý gần nhất, **không ghi dữ liệu** |

### 2.2. Khi triển khai Course Generation (cần thiết kế Job metadata trước)

| ID | Method | Endpoint | Auth | Response | Mục đích |
|---|---|---|---|---|---|
| GEN-01 | POST | `/courses/:courseId/generations` | Bearer + Idempotency-Key | 202 | Yêu cầu sinh nội dung qua BullMQ |
| GEN-02 | GET | `/jobs/:jobId` | Bearer | 200 | Đọc trạng thái job |
| GEN-03 | POST | `/courses/:courseId/approve` | Bearer | 200 | Phê duyệt học liệu + mapping sau validator |

### 2.3. Hoãn đến khi thiết kế bổ sung

- AI Tutor: hội thoại, gợi ý, hint events và stream/SSE – cần `TutorConversation`, `TutorMessage`, `HintEvent` hoặc phương án lưu tương đương.
- Verified PDF RAG: chỉ sau Adaptive Core; cần nguồn tài liệu, phiên bản, chunk, citation, quyền truy cập riêng.
- BKT/PFA: chạy offline/shadow, **không** tự xuất API tính mastery production trước khi có đánh giá.

---

## 3. Auth Contracts – chi tiết

> Những endpoint này là **hợp đồng dự kiến**, chưa triển khai. `RefreshSession`/refresh token rotation cần bản thiết kế Auth DB riêng.

### AUTH-01: `POST /api/v1/auth/register`

**Auth:** Public. **HTTP success:** `201 Created`.

**Request:**

```json
{
  "email": "student@example.com",
  "password": "ExamplePassword123!"
}
```

- `email`: email, trim/normalize; không chứa khoảng trắng đầu/cuối.
- `password`: required, giới hạn độ dài byte hợp lý và kiểm tra chính sách mật khẩu; không ghi log.
- Backend dùng `bcryptjs` để băm mật khẩu; password không đưa vào DTO trả về.

**Response:**

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "email": "student@example.com",
      "createdAt": "2026-11-21T08:30:00.000Z"
    }
  }
}
```

**Errors:** `400 INVALID_INPUT`, `409 EMAIL_ALREADY_EXISTS`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

### AUTH-02: `POST /api/v1/auth/login`

**Auth:** Public. **HTTP success:** `200 OK`. Tạo phiên refresh, đặt HttpOnly cookie.

**Request:**

```json
{
  "email": "student@example.com",
  "password": "ExamplePassword123!"
}
```

**Response:**

```json
{
  "data": {
    "accessToken": "<jwt-access-token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "email": "student@example.com"
    }
  }
}
```

`expiresIn` tính bằng **giây**; Access Token chỉ lưu trong memory frontend. Refresh Token **chỉ** được phát qua cookie HttpOnly, không xuất trong JSON. **Errors:** `400 INVALID_INPUT`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`.

### AUTH-03: `POST /api/v1/auth/refresh`

**Auth:** Refresh Cookie + bảo vệ CSRF phù hợp. **HTTP success:** `200 OK` + cookie mới. **Request body:** không bắt buộc.

**Response:**

```json
{
  "data": {
    "accessToken": "<new-jwt-access-token>",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

Rotation: thu hồi phiên cũ, lưu thông tin phiên mới; ngăn sử dụng lại refresh token theo chính sách Auth. **Errors:** `401 REFRESH_TOKEN_INVALID`, `401 REFRESH_TOKEN_EXPIRED`, `403 CSRF_VALIDATION_FAILED`.

### AUTH-04: `POST /api/v1/auth/logout`

**Auth:** Refresh Cookie (kèm bảo vệ CSRF). **HTTP success:** `204 No Content`; xóa cookie và thu hồi phiên nếu tồn tại. Không xuất response JSON. Nếu session đã mất nhưng request hợp lệ, trả `204` theo thiết kế idempotent.

### AUTH-05: `GET /api/v1/auth/me`

**Auth:** Bearer. **HTTP success:** `200 OK`.

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "email": "student@example.com",
    "createdAt": "2026-11-21T08:30:00.000Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`.

---

## 4. Course & Lesson Contracts

**Quyền truy cập MVP:** Course là **private**, mỗi Course do một User sở hữu. Backend kiểm tra `Course.ownerId` đối với mọi endpoint liên quan. Các `courseId`, `lessonId`, `questionId` trong URI đều là UUID. Để tránh lộ tài nguyên của người khác, các endpoint có thể trả `404` thay cho `403` theo chính sách đã duyệt.

### COURSE-01: `POST /api/v1/courses`

**Auth:** Bearer. **HTTP success:** `201 Created`. Tạo bản ghi Course **draft**, **chưa** tự gọi LLM.

**Request:**

```json
{
  "title": "Danh sách liên kết đơn trong C++",
  "description": "Mục tiêu: học Node, Traversal và Insertion"
}
```

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "title": "Danh sách liên kết đơn trong C++",
    "description": "Mục tiêu: học Node, Traversal và Insertion",
    "status": "draft",
    "createdAt": "2026-11-21T08:31:00.000Z"
  }
}
```

`ownerId` được lấy từ JWT, không nhận từ body. **Errors:** `400 INVALID_INPUT`, `401 UNAUTHORIZED`.

### COURSE-02: `GET /api/v1/courses?page=1&limit=20`

**Auth:** Bearer. **HTTP success:** `200 OK`. Chỉ trả Course thuộc người dùng hiện tại.

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "title": "Danh sách liên kết đơn trong C++",
      "status": "ready",
      "createdAt": "2026-11-21T08:31:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

**Errors:** `401 UNAUTHORIZED`, `400 INVALID_PAGINATION`.

### COURSE-03: `GET /api/v1/courses/:courseId`

**Auth:** Bearer. **HTTP success:** `200 OK`.

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "title": "Danh sách liên kết đơn trong C++",
    "description": "Mục tiêu: học Node, Traversal và Insertion",
    "status": "ready",
    "lessonCount": 3,
    "createdAt": "2026-11-21T08:31:00.000Z",
    "updatedAt": "2026-11-21T09:10:00.000Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `404 COURSE_NOT_FOUND`.

### COURSE-04: `GET /api/v1/courses/:courseId/lessons`

**Auth:** Bearer. **HTTP success:** `200 OK`. Sắp xếp theo `position` tăng dần.

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440201",
      "courseId": "550e8400-e29b-41d4-a716-446655440101",
      "title": "Node và Pointer",
      "position": 1
    }
  ]
}
```

Không trả content đầy đủ ở endpoint danh sách. **Errors:** `404 COURSE_NOT_FOUND`.

### COURSE-05: `GET /api/v1/lessons/:lessonId`

**Auth:** Bearer. **HTTP success:** `200 OK`.

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440201",
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "title": "Node và Pointer",
    "position": 1,
    "content": "Trong danh sách liên kết, mỗi Node lưu dữ liệu và con trỏ tới Node kế tiếp."
  }
}
```

**Errors:** `404 LESSON_NOT_FOUND` (gồm cả trường hợp lesson thuộc course của người khác).

---

## 5. Knowledge Components (KC) Contract

### KC-01: `GET /api/v1/courses/:courseId/skills`

**Auth:** Bearer. **HTTP success:** `200 OK`.

Trả graph của **Mapping Version hiện hành đã approved**; chỉ xem trước draft bằng API riêng khi được thiết kế sau. Một Course `ready` phải có bản approved tương ứng.

```json
{
  "data": {
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "mappingVersionId": "550e8400-e29b-41d4-a716-446655440301",
    "mappingVersionNumber": 1,
    "skills": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440401",
        "skillKey": "KC-LL-01",
        "name": "Node & Pointer"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440402",
        "skillKey": "KC-LL-02",
        "name": "Traversal"
      }
    ],
    "prerequisites": [
      {
        "skillId": "550e8400-e29b-41d4-a716-446655440402",
        "prerequisiteSkillId": "550e8400-e29b-41d4-a716-446655440401"
      }
    ]
  }
}
```

**Quy tắc DAG:** `skillId` là kỹ năng cần học; `prerequisiteSkillId` là kỹ năng phải nắm trước. Không có self-loop, cross-course hoặc chu trình. Validator chạy trước khi duyệt mapping, không dựa vào việc frontend vẽ graph để kiểm tra.

**Errors:** `404 COURSE_NOT_FOUND`, `409 MAPPING_NOT_APPROVED`.

---

## 6. Quiz & Learning Evidence Contracts

### QUIZ-01: `GET /api/v1/lessons/:lessonId/questions`

**Auth:** Bearer. **HTTP success:** `200 OK`.

Chỉ trả phiên bản câu hỏi **được phép làm**. API phải loại `answerKey`, `isCorrect`, đáp án đúng và giải thích sau chấm.

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440501",
      "questionVersionId": "550e8400-e29b-41d4-a716-446655440502",
      "versionNumber": 1,
      "type": "single_choice",
      "prompt": "Một Node của danh sách liên kết đơn thường chứa gì?",
      "options": [
        { "id": "option-a", "text": "Dữ liệu và con trỏ next" },
        { "id": "option-b", "text": "Chỉ số thứ tự" }
      ]
    }
  ]
}
```

`id` là `Question.id` (định danh logic), còn `questionVersionId` là bản nội dung cụ thể. **Không expose** bất kỳ khóa đáp án nào trong endpoint này. `type=single_choice` là loại câu hỏi MVP; phải bổ sung enum khi mở rộng.

**Errors:** `404 LESSON_NOT_FOUND`, `409 COURSE_NOT_READY`.

### QUIZ-02: `POST /api/v1/questions/:questionId/attempts`

**Auth:** Bearer. **Headers:** `Idempotency-Key: <UUID-v4>` và `Content-Type: application/json`.

**Request:**

```json
{
  "questionVersionId": "550e8400-e29b-41d4-a716-446655440502",
  "selectedOptionId": "option-b"
}
```

- `questionId` từ path và `questionVersionId` từ body **phải cùng một câu hỏi**.
- `selectedOptionId` phải nằm trong `QuestionVersion.options`.
- Không nhận `userId`, `isCorrect`, `hintsUsed`, `skillId`, `mappingVersionId` từ client.
- Backend xác định **approved Mapping Version thực sự dùng**, KC chính và `hintsUsed` từ lịch sử server; chấm bằng `answerKey` nội bộ.
- Một QuizAttempt = một lần nộp **một câu hỏi** trong MVP.
- `QuizAttempt`, `LearningEvent` và cập nhật trạng thái liên quan phải đảm bảo toàn vẹn bằng transaction/idempotency. Nếu tính PolicyDecision bất đồng bộ thì thiết kế retry và trạng thái nhất quán riêng.

**Response khi lần đầu nộp thành công (`201 Created`):**

```json
{
  "data": {
    "attemptId": "550e8400-e29b-41d4-a716-446655440601",
    "questionId": "550e8400-e29b-41d4-a716-446655440501",
    "questionVersionId": "550e8400-e29b-41d4-a716-446655440502",
    "isCorrect": false,
    "feedback": "Hãy xem lại cấu trúc Node.",
    "skill": {
      "id": "550e8400-e29b-41d4-a716-446655440401",
      "skillKey": "KC-LL-01",
      "name": "Node & Pointer"
    },
    "masteryStatus": "insufficient_data",
    "submittedAt": "2026-11-21T09:20:00.000Z"
  }
}
```

**Idempotency behavior:**

- Key chưa có: xử lý, trả `201`.
- Cùng user + key + **cùng payload**: không tạo thêm attempt/event; trả lại kết quả với `200`.
- Cùng user + key nhưng **payload khác**: trả `409 IDEMPOTENCY_CONFLICT`.
- Chuyển tiếp retry qua Redis/BullMQ không được tạo thêm bằng chứng học tập.

**Errors:** `400 INVALID_INPUT`, `401 UNAUTHORIZED`, `404 QUESTION_NOT_FOUND`, `409 COURSE_NOT_READY`, `409 MAPPING_NOT_APPROVED`, `409 IDEMPOTENCY_CONFLICT`, `422 OPTION_NOT_IN_QUESTION`.

**Đặc biệt:** Nếu `QuestionVersion` hoặc `SkillMappingVersion` bị thay đổi **sau khi câu hỏi đã hiển thị**, backend phải xác định phiên bản hợp lệ theo chính sách đã định, không tự ý ghi sự kiện theo một mapping không tương ứng. MVP có thể trả `409 QUESTION_VERSION_OUTDATED` và yêu cầu frontend tải lại câu hỏi; cần chọn khi triển khai.

---

## 7. Learner State & Adaptive Policy Contracts

### LEARN-01: `GET /api/v1/courses/:courseId/learner-state`

**Auth:** Bearer. **HTTP success:** `200 OK`. Dữ liệu tính theo `User` hiện tại và chỉ các Skill trong Course của người đó.

```json
{
  "data": {
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "modelType": "rule_based",
    "modelVersion": "rule-v1",
    "skills": [
      {
        "skillId": "550e8400-e29b-41d4-a716-446655440401",
        "skillKey": "KC-LL-01",
        "name": "Node & Pointer",
        "status": "proficient",
        "updatedAt": "2026-11-21T09:30:00.000Z"
      },
      {
        "skillId": "550e8400-e29b-41d4-a716-446655440402",
        "skillKey": "KC-LL-02",
        "name": "Traversal",
        "status": "needs_review",
        "updatedAt": "2026-11-21T09:30:00.000Z"
      }
    ]
  }
}
```

**Các trạng thái:** `insufficient_data`, `learning`, `proficient`, `needs_review`. Với skill chưa có Attempt hợp lệ, backend có thể tổng hợp `insufficient_data` ở runtime, không bắt buộc phải tạo sẵn một hàng LearnerSkillState.

**Không đưa xác suất mastery dưới danh nghĩa BKT** khi sản phẩm chưa dùng BKT production. **Errors:** `404 COURSE_NOT_FOUND`.

### ADAPT-01: `GET /api/v1/courses/:courseId/next-action`

**Auth:** Bearer. **HTTP success:** `200 OK`.

**Nguyên tắc HTTP:** GET **không tạo PolicyDecision mới và không cập nhật LearningEvent**. API **chỉ đọc** gợi ý đã được Backend tính và lưu gần nhất từ sự kiện học tập, hoặc trả `data: null` nếu chưa có quyết định. Khi thiết kế job/event handler tạo gợi ý, phải định nghĩa tính nhất quán khi xử lý bất đồng bộ.

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440701",
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "action": "practice_skill",
    "targetSkillId": "550e8400-e29b-41d4-a716-446655440402",
    "reasonCode": "WEAK_SKILL_PREREQUISITES_MET",
    "message": "Nên luyện lại kỹ năng Traversal trước khi sang bài tiếp theo.",
    "policyVersion": "adaptive-v1",
    "createdAt": "2026-11-21T09:31:00.000Z"
  }
}
```

Trường `message` là bản diễn giải hiển thị, **không thay thế `reasonCode`**. `targetSkillId` có thể `null` cho hành động không có mục tiêu KC cụ thể. Giá trị `PolicyAction`: `review_skill`, `practice_skill`, `next_lesson`, `mini_pretest`, `continue_learning`.

**Không có gợi ý:**

```json
{ "data": null }
```

**Errors:** `404 COURSE_NOT_FOUND`.

---

## 8. AI Course Generation Contracts (chờ thiết kế Job data)

> **Chỉ triển khai phần này sau khi có thiết kế Job/GenerationRun và queue contract.** Các endpoint dưới đây được ghi để frontend/backend thống nhất trước, chưa yêu cầu cài SDK LLM. Provider sẽ chọn sau benchmark 2 model, ngân sách dưới 10 USD/tháng.

**State machine dự kiến cho Course:** `draft → generating → awaiting_approval → ready`; có thể chuyển `generating → failed`; `ready → archived`. **Job status riêng:** `queued → running → succeeded / failed / cancelled`. Không được đồng nhất Job status với Course status.

### GEN-01: `POST /api/v1/courses/:courseId/generations`

**Auth:** Bearer. **Headers:** `Idempotency-Key: <UUID-v4>`.

**Request:**

```json
{
  "learningGoal": "Hiểu và thao tác danh sách liên kết đơn trong C++",
  "targetLevel": "beginner",
  "lessonCount": 3
}
```

**HTTP success:** `202 Accepted`.

```json
{
  "data": {
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "jobId": "550e8400-e29b-41d4-a716-446655440801",
    "jobStatus": "queued",
    "courseStatus": "generating"
  }
}
```

**Rule:** Backend xác thực ownership và trạng thái Course; enqueue BullMQ job, lưu metadata cần thiết và ngăn retry sinh trùng. **Errors:** `404 COURSE_NOT_FOUND`, `409 COURSE_STATE_CONFLICT`, `409 IDEMPOTENCY_CONFLICT`, `503 QUEUE_UNAVAILABLE`.

### GEN-02: `GET /api/v1/jobs/:jobId`

**Auth:** Bearer. **HTTP success:** `200 OK`. Chỉ người sở hữu job có quyền đọc.

```json
{
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440801",
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "status": "succeeded",
    "progress": 100,
    "finishedAt": "2026-11-21T09:50:00.000Z"
  }
}
```

`progress` từ 0–100 nếu worker có thể cung cấp; không giả lập tiến độ như kết quả chính xác. **Errors:** `404 JOB_NOT_FOUND`.

### GEN-03: `POST /api/v1/courses/:courseId/approve`

**Auth:** Bearer, chủ sở hữu. **HTTP success:** `200 OK`.

**Request body:** không cần body trong MVP. Chỉ cho phép khi Course `awaiting_approval`. Backend kiểm tra `SkillMappingVersion`, DAG không chu trình, `QuestionSkill` mỗi câu có đúng một KC chính, học liệu/câu hỏi hợp lệ. Khi duyệt, khóa version và cập nhật Course `ready` nguyên tử trong phạm vi DB transaction thích hợp.

```json
{
  "data": {
    "courseId": "550e8400-e29b-41d4-a716-446655440101",
    "status": "ready",
    "approvedMappingVersionId": "550e8400-e29b-41d4-a716-446655440301"
  }
}
```

**Errors:** `404 COURSE_NOT_FOUND`, `409 COURSE_STATE_CONFLICT`, `422 INVALID_SKILL_GRAPH`, `422 INCOMPLETE_QUESTION_MAPPING`.

---

## 9. Phần chưa chốt/không tạo API trong v1.0

| Phần | Lý do chưa chốt | Khi nào bổ sung |
|---|---|---|
| Tutor chat/SSE | Chưa có hợp đồng `conversationId`, hints, answer-reveal policy và persisted hint events | Khi bắt đầu tính năng Tutor |
| RAG upload/search | Chưa có bảng source/version/chunk, file access policy và citation format | Sau Adaptive Core |
| BKT/PFA production | Chưa có dữ liệu và promotion gate | Sau offline evaluation |
| Refresh Token DB | `ERD.md` hiện chỉ bao gồm 13 thực thể lõi | Trước khi code Auth |
| AI Generation Job DB | Cần lưu job owner/status/retry/usage/cost và thống nhất với BullMQ | Trước khi code GEN-01 |
| Chỉnh sửa Course/Question | Cần policy về published version và kiểm tra tác động lịch sử | Khi thiết kế chức năng edit |

**Các quyết định còn phải review giữa ba thành viên (không tự ngầm hiểu là đã triển khai):**

1. Có dùng **một** KC chính ở Quiz MVP; chốt cách chọn version nếu mapping thay đổi giữa lúc xem và nộp câu.
2. Chốt thời điểm `PolicyDecision` được ghi: đồng bộ sau chấm hoặc worker. `GET /next-action` chỉ đọc.
3. Chốt định nghĩa `Course.ready`: chỉ sau **chủ course phê duyệt** đề cương/KC/quiz, không phải worker tự đặt ready.
4. Hoàn thiện Auth RefreshSession/CSRF để khớp mô hình JWT đã chọn.
5. Hoàn thiện bảng GenerationRun/job metadata; Redis queue không thay thế bền vững cho audit của quá trình sinh nội dung.
6. Xác nhận các trường request/response vừa đủ cho giao diện trong một tháng; mọi thay đổi cần Pull Request cập nhật tài liệu.

---

## 10. Contract Test Plan (chưa viết test)

| Test ID | Endpoint | Kịch bản tối thiểu | Kết quả kỳ vọng |
|---|---|---|---|
| T-AUTH-01 | `POST /auth/login` | Sai mật khẩu | `401 INVALID_CREDENTIALS`, không rò rỉ mật khẩu |
| T-AUTH-02 | `GET /auth/me` | Không có Bearer | `401 UNAUTHORIZED` |
| T-COURSE-01 | `GET /courses/:id` | Course thuộc người khác | `404 COURSE_NOT_FOUND` |
| T-COURSE-02 | `POST /courses` | Gửi `ownerId` giả | Không được chấp nhận hoặc bỏ qua trường lạ theo schema strict; owner lấy từ token |
| T-KC-01 | Approve Mapping | Có chu trình `A→B→A` | `422 INVALID_SKILL_GRAPH` |
| T-QUIZ-01 | `GET /lessons/:id/questions` | Lấy câu hỏi | Không có `answerKey` và `explanation` |
| T-QUIZ-02 | `POST /questions/:id/attempts` | Cùng Idempotency-Key + cùng payload hai lần | Tối đa một QuizAttempt/LearningEvent |
| T-QUIZ-03 | `POST /questions/:id/attempts` | Cùng key nhưng option khác | `409 IDEMPOTENCY_CONFLICT` |
| T-QUIZ-04 | `POST /questions/:id/attempts` | Version không thuộc Question | `400/422 INVALID_QUESTION_VERSION` theo schema cuối |
| T-LEARN-01 | `GET /learner-state` | Chưa có lượt làm | Tất cả skill trạng thái `insufficient_data` |
| T-ADAPT-01 | `GET /next-action` | Gọi liên tục | Không ghi thêm PolicyDecision |
| T-GEN-01 | `POST /generations` | Retry cùng key | Không tạo trùng Generation Run |

---

## 11. Quy trình thay đổi và phê duyệt

- **Owner:** Project Leader / Technical Lead quản lý baseline.
- **Backend reviewer:** kiểm tra quyền, transaction, dữ liệu và schema.
- **Frontend reviewer:** kiểm tra JSON, pagination, loading/error, việc không lộ answerKey.
- **AI/Algorithm reviewer:** kiểm tra KC version, event evidence, state và policy decision.
- Mỗi thay đổi contract cần cập nhật tài liệu, DTO/Zod (khi đã có code), test và Pull Request.
- **Definition of Done cho bản tài liệu:** Không có endpoint mô tả mâu thuẫn ERD; ba vai trò cùng review; ghi nhận quyết định version/trạng thái; chốt các mục bổ sung trước khi lập trình tính năng tương ứng.

### Ký duyệt

- **Technical Lead:** Chưa ký duyệt.
- **Frontend Reviewer:** Chưa review.
- **AI/Algorithm Reviewer:** Chưa review.
- **Next step:** Review `API_CONTRACTS.md` → thống nhất DTO/Zod → chuyển ERD thành Prisma Schema theo module → tạo API khi giao nhiệm vụ.
