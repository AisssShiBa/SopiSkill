# SopiSkill – Architecture

## 1. Thông tin

- Dự án: SopiSkill
- Nhóm: 3 thành viên
- Thời gian: 4 tuần
- Kiến trúc: Monorepo + Modular Monolith

## 2. Technology Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Queue: BullMQ + Redis
- Package Manager: npm workspaces
- Container: Docker Compose

## 3. Repository Structure

- frontend: Giao diện người dùng
- backend: API và worker
- packages/shared: Kiểu dữ liệu chung
- packages/db: Prisma và database
- packages/algorithms: Thuật toán
- packages/ai: LLM adapter
- docs: Tài liệu dự án

## 4. Dependency Rules

- Frontend chỉ gọi backend qua API.
- Frontend không truy cập database.
- Shared không phụ thuộc frontend/backend.
- Algorithms độc lập với framework.
- Backend và worker dùng các package chung.
- Không cho phép circular dependencies.

## 5. Database

PostgreSQL là nguồn lưu dữ liệu chính.
Prisma quản lý schema và migrations.

## 6. AI Architecture

LLM Provider được lựa chọn sau benchmark.
Adaptive Learning triển khai trước PDF RAG.

## 7. Status

Draft – Chờ 3 thành viên review.
