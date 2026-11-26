import { existsSync } from "node:fs";
import { resolve } from "node:path";

process.env.NODE_ENV = "test";

const dbEnvPath = resolve(import.meta.dirname, "../../packages/db/.env");
if (!process.env.DATABASE_URL && existsSync(dbEnvPath)) {
    process.loadEnvFile(dbEnvPath);
}

if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
    process.env.JWT_ACCESS_SECRET =
        "sopiskill-test-jwt-access-secret-fixture-only-32chars";
}
