
import { createPrismaClient } from "@sopiskill/db";

// Lấy DATABASE_URL từ môi trường
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL chưa được cấu hình");
}

// Tạo Prisma Client
const prisma = createPrismaClient(databaseUrl);

try {
    // Kiểm tra kết nối
    await prisma.$connect();

    console.log("✅ Kết nối PostgreSQL thành công!");

    // Thử đọc số lượng User trong database
    const totalUsers = await prisma.user.count();

    console.log("Tổng số User:", totalUsers);
} catch (error) {
    console.error("❌ Kiểm tra database thất bại:", error.message);
    process.exitCode = 1;
} finally {
    // Đóng kết nối sau khi kiểm tra
    await prisma.$disconnect();
}
