import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Une seule instance en développement : le rechargement à chaud de Next.js
// réévalue les modules et créerait sinon un pool de connexions par rechargement.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function creerClient() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL n'est pas défini");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
