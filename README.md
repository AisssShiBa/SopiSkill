
# SopiSkill

Hệ thống học tập thích ứng sử dụng AI.

## Technology Stack

- Frontend: React, Vite, TypeScript
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL 16, Prisma 7
- Shared Contracts: Zod
- AI: LLM Adapter, provider sẽ chọn sau benchmark
- Package Manager: npm workspaces

## Project Structure

- frontend/          Giao diện người học
- backend/           REST API
- packages/shared/   DTO và Zod Schemas
- packages/db/       Prisma và database
- docs/              Tài liệu kỹ thuật

## Development Requirements

- Node.js: 24.22.3
- npm: 11.21.2
- Docker Desktop
- Git

## Setup

1. Clone repository.
2. Tạo .env từ các file .env.example.
3. Chạy npm ci ở thư mục gốc.
4. Khởi động PostgreSQL:

   docker compose up -d postgres

5. Áp dụng database migrations:

   npm exec -w @sopiskill/db -- prisma migrate dev

6. Build packages dùng chung:

   npm run build -w @sopiskill/shared
   npm run build -w @sopiskill/db

7. Chạy backend:

   npm run dev -w backend

8. Chạy frontend ở terminal khác:

   npm run dev -w frontend -- --port 5174

## Testing

Shared Contracts:

npm test -w @sopiskill/shared

Backend Typecheck:

npm run typecheck -w backend

## Documentation

- docs/ARCHITECTURE.md
- docs/DATA_CONTRACTS.md
- docs/ERD.md
- docs/API_CONTRACTS.md
- docs/SHARED_CONTRACTS.md
- docs/ROADMAP.md
- CONTRIBUTING.md

## Contribution

Không push trực tiếp vào main.
Mọi thay đổi thực hiện qua Issue, Branch và Pull Request.
