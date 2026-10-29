import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Turso (libSQL) in production — a hosted, SQLite-compatible database that
// persists independently of Render's ephemeral filesystem (the Free plan
// has no persistent disk, so a local SQLite file resets on every deploy).
// Falls back to a local file for development, where that reset doesn't
// matter and there's no Turso database to point at.
const adapter =
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ? new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    : new PrismaBetterSqlite3({
        url: (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, ""),
      });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
