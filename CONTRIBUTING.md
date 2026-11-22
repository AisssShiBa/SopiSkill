
# SopiSkill – Team Contribution Guidelines

## 1. Repository Rules

- Chỉ sử dụng một Monorepo.
- Không push trực tiếp vào main.
- Mỗi nhiệm vụ có GitHub Issue.
- Mỗi nhiệm vụ có branch riêng.
- Mỗi Pull Request cần ít nhất một người khác review.
- Không merge khi typecheck, build hoặc test liên quan thất bại.

## 2. Branch Naming

- feature/<issue-id>-<description>
- fix/<issue-id>-<description>
- chore/<issue-id>-<description>
- docs/<issue-id>-<description>

Ví dụ:
feature/12-course-layout
chore/5-backend-middlewares

## 3. Commit Messages

Sử dụng:

type(scope): description

Các type:
- feat: Chức năng mới
- fix: Sửa lỗi
- refactor: Tái cấu trúc
- test: Kiểm thử
- docs: Tài liệu
- chore: Cấu hình, công cụ

Ví dụ:
feat(frontend): add course layout
test(algorithms): cover dag cycles

## 4. Package Ownership

- frontend/: Người phụ trách Frontend
- backend/: Leader phụ trách nền tảng và tích hợp
- packages/algorithms/: Người phụ trách AI/Algorithms
- packages/shared/: Thay đổi phải có review liên quan
- packages/db/: Thay đổi schema/migration phải có Leader review

Ownership là trách nhiệm review, không cấm thành viên khác đóng góp.

## 5. Naming

- TypeScript/JSON: camelCase
- Type/Interface: PascalCase
- Database: snake_case
- API Prefix: /api/v1

Chi tiết trong docs/DATA_CONTRACTS.md.

## 6. Dependency Rules

- Frontend không import Backend hoặc DB.
- Backend sử dụng Shared và DB qua package exports.
- Algorithms không phụ thuộc Express hoặc React.
- Không tạo circular dependencies.
- Chỉ quản lý package-lock.json ở root.

## 7. Before Pull Request

- Đồng bộ main.
- Kiểm tra typecheck.
- Chạy các test liên quan.
- Không commit .env hoặc secrets.
- Cập nhật tài liệu nếu contract thay đổi.
- Mô tả rõ cách kiểm thử.

## 8. Definition of Done

Một nhiệm vụ hoàn thành khi:
- Đáp ứng Acceptance Criteria.
- Không phá vỡ phần đã hoạt động.
- Có kiểm thử phù hợp.
- Được review.
- Đã merge vào main.

## 9. Team Communication

- Báo blockers ngay khi phát hiện.
- Không tự ý đổi API Contract hoặc Prisma Schema.
- Thay đổi kiến trúc cần có Issue và được Leader phê duyệt.
- Mỗi ngày cập nhật tiến độ trên GitHub Projects.
