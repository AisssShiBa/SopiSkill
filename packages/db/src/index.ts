
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/client.js";

export { PrismaClient };

export function createPrismaClient(connectionString: string) {
    if (!connectionString) {
        throw new Error("DATABASE_URL is required");
    }

    const adapter = new PrismaPg({
        connectionString,
    });

    return new PrismaClient({ adapter });
}
