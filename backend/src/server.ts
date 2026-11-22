
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";

const port = Number(process.env.PORT ?? 4100);
const host = "127.0.0.1";

async function main() {
    console.log("Đang khởi động SopiSkill Backend...");

    // Kết nối PostgreSQL
    await prisma.$connect();
    console.log("PostgreSQL đã kết nối");

    // Khởi động Express
    const server = app.listen(port, host, () => {
        console.log(
            `SopiSkill Backend đang chạy tại http://${host}:${port}`
        );
    });

    // Đóng kết nối khi dừng server
    async function shutdown() {
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
    }

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}

// BẮT BUỘC gọi hàm main()
main().catch(async (error) => {
    console.error("Backend startup failed:", error);
    await prisma.$disconnect();
    process.exitCode = 1;
});
