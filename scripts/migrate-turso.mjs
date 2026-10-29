// Prisma's CLI (schema/migrate engine) only understands a local SQLite file
// or a real Postgres/MySQL connection string — it can't talk to a remote
// libsql:// Turso database directly (there's no "adapter" hook for the CLI,
// only for the generated Client at runtime; see src/lib/db.ts). So this
// script decides which path to take at boot:
//   - TURSO_DATABASE_URL set → apply pending migrations by hand through the
//     libSQL client (skipping ones already recorded in a tracking table).
//   - otherwise → shell out to the normal "prisma migrate deploy" against
//     the local SQLite file, same as before Turso existed.
// Safe to run on every boot — both paths are idempotent.
import { createClient } from "@libsql/client";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");

function splitStatements(sql) {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrateTurso(url, authToken) {
  const client = createClient({ url, authToken });

  await client.execute(
    `CREATE TABLE IF NOT EXISTS "_turso_migrations" ("id" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
  );
  const applied = await client.execute(`SELECT "id" FROM "_turso_migrations"`);
  const appliedIds = new Set(applied.rows.map((r) => String(r.id)));

  const entries = readdirSync(migrationsDir)
    .filter((name) => statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();

  for (const name of entries) {
    if (appliedIds.has(name)) continue;
    const sqlPath = path.join(migrationsDir, name, "migration.sql");
    const sql = readFileSync(sqlPath, "utf8");
    const statements = splitStatements(sql);
    console.log(`[migrate] Applying ${name} to Turso (${statements.length} statements)...`);
    for (const statement of statements) {
      await client.execute(statement);
    }
    await client.execute({
      sql: `INSERT INTO "_turso_migrations" ("id") VALUES (?)`,
      args: [name],
    });
    console.log(`[migrate] Applied ${name}.`);
  }

  console.log("[migrate] Turso database up to date.");
}

function migrateLocal() {
  console.log("[migrate] No Turso env vars set — running prisma migrate deploy against local SQLite.");
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    await migrateTurso(url, authToken);
  } else {
    migrateLocal();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
