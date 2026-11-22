# SOPISKILL – DATA CONVENTIONS & CONTRACT STANDARDS

**Version:** 1.0.0  
**Status:** APPROVED – Technical Baseline  
**Owner:** Project Leader / Technical Lead  
**Ngày ban hành:** 21/11/2026  
**Áp dụng cho:** Frontend, Backend, Shared Packages, Database, Worker và AI Modules

---

## 1. Mục đích

Tài liệu quy định các tiêu chuẩn thống nhất về tên dữ liệu, kiểu dữ liệu, định danh, thời gian, API, bảo mật, phiên bản và lịch sử học tập của SopiSkill.

Mục tiêu:

- Đảm bảo ba thành viên phát triển theo cùng tiêu chuẩn.
- Tránh khác biệt dữ liệu giữa Frontend và Backend.
- Hỗ trợ tái sử dụng TypeScript Types và Zod Schemas.
- Đảm bảo dữ liệu học tập có thể dùng cho các thuật toán Adaptive Learning, BKT và PFA.
- Giảm rủi ro thay đổi database và API trong quá trình tích hợp.

Quy chuẩn này áp dụng cho toàn bộ module của SopiSkill. Chi tiết bảng và endpoint được quản lý trong `ERD.md` và `API_CONTRACTS.md`.

## 2. Naming Conventions

| Đối tượng | Quy chuẩn | Ví dụ |
|---|---|---|
| Biến, hàm TypeScript | camelCase | `getCourseById` |
| Thuộc tính JSON | camelCase | `courseId`, `createdAt` |
| Type, Interface, Class | PascalCase | `CourseDTO`, `AuthService` |
| Prisma Model | PascalCase, số ít | `LearningEvent` |
| PostgreSQL Table | snake_case, số nhiều | `learning_events` |
| PostgreSQL Column | snake_case | `question_id` |
| Enum Values | snake_case | `in_progress`, `needs_review` |
| Hằng số chương trình | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| REST Endpoint | lowercase, kebab-case nếu nhiều từ | `/learner-state` |
| Thư mục module | lowercase, kebab-case nếu cần | `course-generation` |

**Quy tắc bắt buộc:**

- Không trộn `snake_case` và `camelCase` trong cùng một API JSON.
- Không dùng tên viết tắt khó hiểu.
- Không đổi tên trường dữ liệu đã công bố mà không cập nhật API Contract.
- Prisma sử dụng `@map` và `@@map` để ánh xạ tên TypeScript sang tên PostgreSQL khi cần.

## 3. Identity Standards

**Primary Key:** UUID v4.

Quy định:

- ID của thực thể nghiệp vụ được Backend tạo.
- Database sử dụng UUID cho Primary Key và Foreign Key.
- Frontend không được tự tạo ID của User, Course, Lesson, Question hoặc Skill.
- ID truyền qua API dưới dạng chuỗi UUID.
- Backend phải xác thực ID trước khi truy vấn.
- Không dùng ID tăng tự động làm định danh công khai của thực thể nghiệp vụ.

Ví dụ UUID:

`550e8400-e29b-41d4-a716-446655440000`

**Ngoại lệ:** Frontend được tạo UUID cho `Idempotency-Key` của request nhằm nhận diện một thao tác được gửi lại. UUID này không phải Primary Key của thực thể.

Các khóa kỹ năng như `KC-LL-01` là mã nghiệp vụ (`skillKey`), không thay thế UUID của Skill.

## 4. Data Type Standards

| Loại dữ liệu | TypeScript / JSON | PostgreSQL |
|---|---|---|
| ID | string (UUID) | UUID |
| Văn bản | string | TEXT / VARCHAR |
| Số nguyên | number | INTEGER / BIGINT |
| Giá trị đúng/sai | boolean | BOOLEAN |
| Thời gian | ISO 8601 string tại API | TIMESTAMPTZ |
| Ngày không có giờ | YYYY-MM-DD | DATE |
| Xác suất | number từ 0 đến 1 | DOUBLE PRECISION |
| Giá trị tiền chính xác | decimal string | NUMERIC |
| Cấu trúc JSON | object | JSONB khi cần |

Quy định:

- Không dùng `any` tùy tiện trong TypeScript.
- Dữ liệu đầu vào từ API, LLM hoặc file phải được kiểm tra tại runtime.
- Không dùng số thực để biểu diễn chính xác tiền hoặc các phép tính tài chính.
- `BigInt` và `Decimal` không được trả trực tiếp dưới dạng đối tượng không thể serialize; phải chuyển đổi sang định dạng JSON đã thống nhất.
- `null` biểu thị dữ liệu được xác định là chưa có giá trị.
- Trường không xuất hiện trong PATCH nghĩa là không yêu cầu thay đổi.

Các giới hạn độ dài, khoảng giá trị và tính bắt buộc của từng trường được định nghĩa trong Zod Schema.

## 5. Time & Date Standards

**Múi giờ lưu trữ:** UTC.

**Định dạng API:** ISO 8601 có múi giờ UTC.

Ví dụ:

`2026-11-21T08:30:00.000Z`

Quy định:

- Backend lưu thời gian theo UTC.
- PostgreSQL ưu tiên `TIMESTAMPTZ` cho các mốc thời gian.
- Frontend chuyển đổi giờ hiển thị sang múi giờ người dùng.
- Không gửi chuỗi ngày giờ không có thông tin múi giờ đối với timestamp.
- Các trường thời gian đặt tên nhất quán: `createdAt`, `updatedAt`, `completedAt`, `occurredAt`.
- Thời gian dùng để xác nhận lượt làm bài và các quyết định quan trọng phải lấy từ server.

Ví dụ:

- Database: `created_at`.
- Prisma và API: `createdAt`.

## 6. API Standards

**Kiến trúc:** REST API.

**API Prefix:** `/api/v1`

**Content-Type:** `application/json`, trừ các API tải file hoặc streaming.

**Quy tắc endpoint:**

- `GET`: truy xuất.
- `POST`: tạo dữ liệu hoặc thực hiện thao tác.
- `PATCH`: cập nhật một phần.
- `DELETE`: xóa hoặc thực hiện hành động xóa theo hợp đồng.

Tên tài nguyên dùng danh từ số nhiều khi phù hợp.

Ví dụ:

- `GET /api/v1/courses`
- `POST /api/v1/courses`
- `GET /api/v1/courses/:courseId`
- `PATCH /api/v1/courses/:courseId`

Không sử dụng tên endpoint như `/getAllCourses` khi có thể biểu diễn bằng HTTP method.

## 7. API Response Format

### 7.1. Success Response

Mọi API trả JSON thành công sử dụng trường `data`.

Ví dụ:

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Cấu trúc dữ liệu C++",
    "status": "ready"
  }
}
```

Với API trả danh sách:

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

API `204 No Content` không trả response body.

### 7.2. Error Response

Tất cả API trả lỗi sử dụng cấu trúc:

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

Quy định:

- `code`: mã lỗi ổn định cho Frontend xử lý.
- `message`: thông báo dễ hiểu.
- `details`: chi tiết đã lọc an toàn, có thể là `null`.
- `requestId`: dùng đối chiếu log.
- Không trả stack trace, SQL query, mật khẩu hoặc secret trong response production.

## 8. HTTP Status Codes

| Status | Ý nghĩa |
|---|---|
| 200 | Truy vấn hoặc thao tác thành công |
| 201 | Tạo tài nguyên thành công |
| 202 | Đã tiếp nhận yêu cầu bất đồng bộ |
| 204 | Thành công, không có response body |
| 400 | Request sai định dạng |
| 401 | Chưa xác thực hoặc token không hợp lệ |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột dữ liệu hoặc trạng thái |
| 422 | Dữ liệu không đáp ứng validation nghiệp vụ |
| 429 | Vượt giới hạn request |
| 500 | Lỗi server không mong muốn |
| 503 | Dịch vụ tạm thời không sẵn sàng |

Không trả HTTP 200 cho một thao tác thực tế đã thất bại.

## 9. Pagination, Filtering & Sorting

Đối với API danh sách trong MVP, sử dụng phân trang:

- `page`: mặc định 1, tối thiểu 1.
- `limit`: mặc định 20, tối đa 100.
- `total`: tổng số bản ghi phù hợp bộ lọc.
- `totalPages`: tổng số trang.
- Sắp xếp mặc định: mới nhất trước, sau đó theo ID để ổn định thứ tự.

Ví dụ:

`GET /api/v1/courses?page=1&limit=20`

Trường lọc và sắp xếp phải thuộc danh sách cho phép; không đưa trực tiếp tên cột tùy ý từ client vào SQL.

Nếu Learning Events phát triển đến quy mô lớn, nhóm có thể bổ sung cursor pagination bằng một phiên bản hợp đồng tương thích.

## 10. Authentication & Authorization

Công nghệ xác thực:

- JWT Access Token bằng `jsonwebtoken`.
- Mật khẩu được hash bằng `bcryptjs`.
- Refresh Token được quản lý tại Backend.
- Access Token lưu trong bộ nhớ ứng dụng Frontend.
- Refresh Token lưu trong HttpOnly Cookie.

**Quy chuẩn đề xuất:**

- Access Token có thời hạn 15 phút.
- Refresh Token có thời hạn tối đa 7 ngày.
- Refresh Token được tạo ngẫu nhiên, lưu bản băm phía server và xoay vòng khi refresh.
- Access Token truyền qua `Authorization: Bearer <token>`.
- Token phải được kiểm tra chữ ký, thời hạn và các claim cần thiết.
- Đăng xuất phải thu hồi Refresh Token tương ứng.

Cookie:

- `HttpOnly: true`.
- `Secure: true` khi chạy HTTPS.
- `SameSite: Lax` khi frontend và API hoạt động trong mô hình same-site phù hợp.
- Nếu triển khai cross-site thực sự, phải thiết kế cookie `SameSite=None; Secure` cùng các biện pháp chống CSRF phù hợp.

CORS chỉ cho phép những origin được cấu hình cụ thể.

**Authorization:**

- Backend kiểm tra quyền tại từng tài nguyên.
- Client không được quyết định quyền sở hữu.
- `userId` lấy từ phiên xác thực khi thực hiện thao tác của người dùng hiện tại.
- Course, LearningEvent và LearnerSkillState phải được kiểm tra theo quyền truy cập.

## 11. Domain Data & Ownership

Trong MVP v1:

- Mỗi Course có một User sở hữu (`ownerId`).
- Course mặc định là tài nguyên riêng tư.
- Lesson và Question thuộc Course thông qua quan hệ đã xác định.
- Skill thuộc phạm vi một Course.
- LearningEvent được gắn với User và lượt làm bài.
- LearnerSkillState được xác định theo User và Skill.

Không hỗ trợ nhiều người đồng sở hữu hoặc đăng ký học cùng một Course trong MVP. Nếu mở rộng sau này, cần bổ sung Enrollment và chính sách quyền truy cập riêng.

## 12. Domain Status & Enum

**CourseStatus**

- `draft`
- `awaiting_approval`
- `generating`
- `ready`
- `failed`
- `archived`

**GenerationJobStatus**

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

**MasteryStatus**

- `insufficient_data`
- `learning`
- `proficient`
- `needs_review`

**PolicyAction**

- `review_skill`
- `practice_skill`
- `next_lesson`
- `mini_pretest`
- `continue_learning`

Quy định:

- Frontend và Backend sử dụng chung danh sách enum.
- Không tự phát sinh giá trị trạng thái ở mỗi module.
- Trạng thái của Course và trạng thái của Job là hai khái niệm khác nhau.
- Mọi chuyển trạng thái quan trọng phải được Backend kiểm tra.

## 13. Question, Skill & Mapping Versioning

### 13.1. Skill

Mỗi Skill có:

- UUID định danh.
- `courseId`.
- `skillKey` ổn định trong Course.
- Tên và mô tả kỹ năng.

`skillKey` không được đổi tùy tiện khi chỉnh sửa nội dung hiển thị.

### 13.2. Question Version

Mỗi phiên bản câu hỏi cần có định danh hoặc snapshot bất biến.

Quy tắc:

- Sửa nội dung hoặc đáp án có ý nghĩa đánh giá thì tạo phiên bản mới.
- Lượt làm bài cũ vẫn tham chiếu được phiên bản đã sử dụng.
- Không tính lại lịch sử bằng đáp án mới mà không có quy trình đánh giá và ghi nhận riêng.

### 13.3. KC Mapping

Mỗi Course có thể có nhiều phiên bản KC Mapping.

Một Mapping Version gồm:

- `id`: UUID.
- `courseId`: UUID.
- `versionNumber`: số nguyên tăng dần.
- `status`: trạng thái kiểm tra/phê duyệt.

Trong MVP:

- Mỗi Question Version phải có đúng một KC chính.
- Câu hỏi chỉ được ánh xạ tới Skill thuộc đúng Course.
- Không được có quan hệ tiên quyết tạo thành chu trình.
- Mapping được sử dụng trong lượt làm bài phải có thể truy vết lại.
- Việc tạo Mapping Version mới không được ghi đè lịch sử phiên bản cũ.

Mô hình dữ liệu được thiết kế có khả năng mở rộng sang nhiều KC cho một câu hỏi, nhưng không bắt buộc dùng đa KC trong MVP.

## 14. Learning Events & Adaptive Learning

### 14.1. Learning Events

`LearningEvent` lưu bằng chứng học tập có thể truy vết.

Mỗi sự kiện chấm bài cần lưu tối thiểu:

- `id`.
- `userId`.
- `attemptId`.
- `questionVersionId`.
- `skillId` của KC chính.
- `mappingVersionId`.
- `isCorrect`.
- `hintsUsed`.
- `occurredAt`.

Quy định:

- Backend là nơi chấm bài.
- Không nhận `isCorrect` hoặc điểm do client tự khai.
- `hintsUsed` được xác định từ dữ liệu tương tác do server ghi nhận.
- Sự kiện đã ghi không được sửa để thay đổi lịch sử.
- Cùng một lượt nộp bài không được tạo trùng sự kiện.
- Gửi lại một request hợp lệ không được tính thành một lượt luyện tập mới ngoài ý muốn.

### 14.2. LearnerSkillState

Trạng thái kỹ năng hiện tại được lưu riêng với lịch sử sự kiện.

Mỗi trạng thái gồm:

- `userId`.
- `skillId`.
- `status`.
- `modelType`.
- `modelVersion`.
- `updatedAt`.

Với MVP, `modelType = rule_based`.

Trạng thái phải có khả năng được tái tính từ các Learning Events hợp lệ theo phiên bản thuật toán đã ghi nhận.

BKT/PFA chỉ là mô hình nghiên cứu offline cho đến khi có dữ liệu và kết quả đánh giá đáp ứng điều kiện.

### 14.3. PolicyDecision

Mỗi quyết định gợi ý quan trọng cần có:

- `userId`.
- `targetSkillId` nếu có.
- `action`.
- `reasonCode`.
- `policyVersion`.
- `createdAt`.

Không chỉ lưu lời giải thích tự do. Phải có `reasonCode` ổn định để kiểm thử và đánh giá chính sách.

## 15. Idempotency & Data Integrity

Các thao tác có nguy cơ bị gửi lại cần hỗ trợ idempotency.

Trong MVP, ưu tiên:

- Nộp Quiz.
- Yêu cầu tạo khóa học bằng AI.
- Những thao tác ghi dữ liệu có thể bị retry qua Worker.

Client gửi `Idempotency-Key` là UUID v4 cho một thao tác logic.

Backend xác định khóa theo người dùng và loại thao tác, lưu trạng thái/kết quả xử lý để tránh ghi trùng. Gửi lại cùng khóa và cùng dữ liệu phải trả kết quả tương ứng; dùng cùng khóa với dữ liệu khác phải bị từ chối.

Các thao tác lưu Attempt, LearningEvent và trạng thái liên quan phải được thiết kế với transaction và ràng buộc duy nhất phù hợp.

Redis không thay thế các ràng buộc toàn vẹn trong PostgreSQL.

## 16. AI Data Standards

Đầu ra từ LLM được xem là dữ liệu chưa đáng tin cậy.

Quy định:

- Backend validate Structured Output bằng schema.
- Không đưa JSON từ LLM trực tiếp vào database khi chưa kiểm tra.
- Đề xuất Skill Graph phải qua kiểm tra DAG.
- Quiz phải qua kiểm tra cấu trúc và tính hợp lệ của đáp án.
- Không cho LLM trực tiếp quyết định quyền truy cập.
- Không cho LLM tự ý cập nhật LearnerSkillState mà bỏ qua Learning Engine.
- Ghi nhận model, provider, prompt/schema version và token usage khi phát sinh tác vụ AI thật.
- Dữ liệu mock phải được đánh dấu rõ, không trình bày như nội dung đã được LLM thật sinh ra.
- Lựa chọn provider production chỉ được đưa ra sau benchmark đã thống nhất.

Khi bổ sung RAG, thông tin nguồn, phiên bản tài liệu và tham chiếu đoạn chứng cứ phải được lưu để kiểm chứng trích dẫn.

## 17. Privacy & Data Protection

- Không lưu mật khẩu dạng plaintext.
- Không log JWT, Refresh Token, API key hoặc nội dung nhạy cảm không cần thiết.
- Không trả dữ liệu người học cho người dùng khác nếu chưa có quyền.
- Chỉ thu thập dữ liệu cần thiết để phục vụ chức năng học tập.
- Chỉ sử dụng dữ liệu học tập cho nghiên cứu theo chính sách và sự đồng ý phù hợp.
- Phải có quy trình xóa hoặc ẩn danh dữ liệu khi cần.
- Không xóa lịch sử học tập một cách tùy tiện chỉ để thay đổi kết quả thuật toán.
- Lưu trữ và truy cập tài liệu người học phải được kiểm tra quyền tại server.

## 18. Shared Contracts

Các DTO và schema được chia sẻ theo cấu trúc Monorepo:

- `frontend` sử dụng DTO và schema công khai.
- `backend` validate input/output và sử dụng schema tương ứng.
- `packages/shared` chứa các kiểu dữ liệu không phụ thuộc Express, Prisma hay React.
- Không đưa `passwordHash`, database credentials hoặc trường nội bộ vào DTO công khai.
- Không xuất trực tiếp toàn bộ Prisma Model sang Frontend.

Những thay đổi DTO có thể ảnh hưởng tới nhiều thành viên phải được review trước khi merge.

## 19. Contract Change Management

Quy chuẩn sử dụng phiên bản tài liệu theo Semantic Versioning:

- MAJOR: thay đổi không tương thích với hợp đồng cũ.
- MINOR: bổ sung quy định tương thích.
- PATCH: sửa lỗi diễn đạt không thay đổi hành vi.

Khi thay đổi một API hoặc cấu trúc dữ liệu dùng chung:

1. Cập nhật tài liệu hợp đồng liên quan.
2. Đánh giá tác động tới Frontend, Backend, Worker và thuật toán.
3. Cập nhật Shared Types/Zod Schema nếu đã triển khai.
4. Bổ sung hoặc cập nhật kiểm thử.
5. Thực hiện Pull Request.
6. Được một thành viên khác review trước khi merge.

Không tự ý sửa hợp đồng dữ liệu trên nhánh `main`.

## 20. Definition of Done – Data Contracts

Một chức năng liên quan dữ liệu được coi là hoàn thành khi:

- Tuân thủ quy tắc đặt tên và kiểu dữ liệu.
- Request/response phù hợp API Contract.
- Validation được thực hiện tại Backend.
- Quyền sở hữu tài nguyên được kiểm tra.
- Không tiết lộ trường nhạy cảm.
- Nếu có migration, migration được kiểm thử.
- Nếu ảnh hưởng KC hoặc LearningEvent, version được bảo toàn.
- Test liên quan chạy thành công.
- Thay đổi được review và merge theo quy trình nhóm.

## 21. Tài liệu liên quan

- `docs/ARCHITECTURE.md` – Kiến trúc hệ thống.
- `docs/ERD.md` – Các thực thể, quan hệ và ràng buộc database.
- `docs/API_CONTRACTS.md` – Hợp đồng chi tiết từng endpoint.
- `docs/TEAM_CONVENTIONS.md` – Quy tắc code, Git và review.
- `docs/ROADMAP.md` – Kế hoạch triển khai.

---

**Quyết định quản trị:** Quy chuẩn v1.0 được chọn làm baseline cho SopiSkill. Technical Lead chịu trách nhiệm kiểm soát thay đổi; các thành viên được quyền đề xuất cải tiến nhưng không tự ý thay đổi hợp đồng đã thống nhất.