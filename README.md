# SopiSkill

SopiSkill là hệ thống hỗ trợ học tập thích ứng sử dụng AI.

Hệ thống hướng đến việc theo dõi quá trình học, đánh giá mức độ
thành thạo kỹ năng và đưa ra gợi ý học tập phù hợp với từng người.

## 1. Current Development Phase

**Giai đoạn hiện tại: Backend-first**

Nhóm đang tập trung phát triển:

- REST API bằng Node.js và Express
- PostgreSQL và Prisma
- Authentication JWT
- Course và Lesson Management
- Knowledge Component Graph
- Quiz và Learning Events
- Adaptive Learning Algorithms
- Unit Tests và API Tests

Frontend sẽ được triển khai sau khi thiết kế Stitch được thống nhất.

## 2. Team Members

| Thành viên | Vai trò                 |
| ---------- | ----------------------- |
| Nguyên     | Developer               |
| Hữu        | Developer               |
| Đạt        | Developer / Team Leader |

Cả ba thành viên đều tham gia phát triển Backend.

Công việc được phân chia theo chức năng, không cố định
mỗi người vào một tầng kiến trúc.

## 3. Technology Stack

- Node.js: 24.22.3
- npm: 11.21.2
- TypeScript
- Express
- PostgreSQL 16
- Prisma 7
- Zod
- JWT Authentication
- Docker Compose
- Vitest và Supertest (kiểm thử Backend)

Frontend dự kiến:

- React + Vite
- Tailwind CSS + shadcn/ui

Frontend chưa nằm trong phạm vi triển khai hiện tại.

## 4. Project Structure

```text
SopiSkill/
├── frontend/
├── backend/
├── packages/
│   ├── shared/
│   └── db/
├── docs/
├── package.json
├── package-lock.json
├── compose.yaml
└── README.md
```

### backend/

Chứa mã nguồn REST API.

### packages/shared/

Chứa DTO và Zod Schemas được sử dụng chung.

### packages/db/

Chứa Prisma Schema, migrations và Prisma Client.

### docs/

Chứa các tài liệu thiết kế và quy ước của dự án.

## 5. Development Requirements

Cần cài đặt:

- Node.js 24.22.3
- npm 11.21.2
- Docker Desktop
- Git
- VS Code

## 6. Installation

Thực hiện các lệnh tại thư mục gốc của repository.

### Step 1: Clone Repository

```bash
git clone <REPOSITORY_URL>
```

Thay REPOSITORY_URL bằng URL GitHub của nhóm.

### Step 2: Install Dependencies

```bash
npm ci
```

Lệnh này cài đặt dependencies theo package-lock.json.

### Step 3: Configure Environment

Tạo file:

packages/db/.env

dựa trên:

packages/db/.env.example

Điền DATABASE_URL phù hợp với PostgreSQL trên máy.

Không commit file .env lên GitHub.

### Step 4: Start PostgreSQL

```bash
docker compose up -d postgres
```

### Step 5: Database Migration

Kiểm tra trạng thái:

```bash
npm exec -w @sopiskill/db -- prisma migrate status
```

Đối với database phát triển mới, áp dụng
các migration đã được nhóm commit:

```bash
npm exec -w @sopiskill/db -- prisma migrate deploy
```

Không tự ý tạo hoặc sửa migration đã được commit.

### Step 6: Build Shared Packages

```bash
npm run build -w @sopiskill/shared
```

```bash
npm run build -w @sopiskill/db
```

### Step 7: Start Backend

```bash
npm run dev -w backend
```

Backend hiện được cấu hình chạy tại:

http://127.0.0.1:4100

### Step 8: Health Check

```bash
curl http://127.0.0.1:4100/api/v1/health
```

Nếu API phản hồi thành công, Backend đã khởi động.

## 7. Testing

### Shared Contracts

```bash
npm test -w @sopiskill/shared
```

### Backend Typecheck

```bash
npm run typecheck -w backend
```

### Database Typecheck

```bash
npm run typecheck -w @sopiskill/db
```

### Backend API Tests

Vitest và Supertest đang cần được thiết lập
trong giai đoạn chuẩn bị Backend.

Không đánh dấu task hoàn thành nếu thiếu kiểm thử cần thiết.

## 8. Coding Conventions

- TypeScript và JSON dùng camelCase.
- Database dùng snake_case.
- ID sử dụng UUID.
- API prefix: /api/v1.
- Response thành công: { "data": ... }.
- Response lỗi tuân theo Shared Contracts.
- Backend phải validate request.
- Không trả dữ liệu nhạy cảm.
- Không thay đổi API Contract tùy ý.

## 9. Git Workflow

Không push code trực tiếp lên main.

Mỗi thành viên:

1. Nhận nhiệm vụ trên Google Sheets.
2. Đồng bộ code mới nhất.
3. Làm việc trên branch riêng.
4. Commit và push code.
5. Tạo Pull Request.
6. Nhờ thành viên khác review.
7. Merge sau khi đạt yêu cầu.
8. Cập nhật trạng thái trên Google Sheets.

Mỗi Pull Request nên tập trung vào một nhiệm vụ.

## 10. Definition of Done

Một nhiệm vụ chỉ được công nhận hoàn thành khi:

- Chức năng hoạt động đúng yêu cầu.
- API tuân thủ Shared Contracts.
- Có xử lý lỗi và validation.
- Các bài test liên quan chạy thành công.
- Pull Request được review và merge.
- Reviewer xác nhận trên Google Sheets.

## 11. Project Management

Công việc được quản lý tại:

https://docs.google.com/spreadsheets/d/1yT58CGz2u5LKVGKeT6lrvDJAqqlmLThsK3rb5JsjhgA/edit

## 12. Documentation

Các tài liệu kỹ thuật:

- docs/ARCHITECTURE.md
- docs/DATA_CONTRACTS.md
- docs/ERD.md
- docs/API_CONTRACTS.md
- docs/SHARED_CONTRACTS.md

Backend Phase Scope:

https://docs.google.com/document/d/10vxuJps08QteFYe6ECMJk3vrtg_2z5ma9s-HcR2THqY/edit

Team Development Guide:

https://docs.google.com/document/d/1BTxoEFbXMhTKuZZSqk3mLsBrBQ0TwO2Pk7_lRgYZbKI/edit

## 13. Important Rules

- Không tự ý sửa Prisma Schema hoặc migration.
- Không tự ý cập nhật dependencies.
- Không commit .env hoặc secrets.
- Không thay đổi Shared Contracts khi chưa thống nhất.
- Không merge code chưa được review.
- Không triển khai Frontend trước khi Leader duyệt Stitch.
