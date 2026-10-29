// prisma/seed.ts always wipes-and-reseeds (organization.deleteMany() at the
// top) — fine for a deliberate local reset, but it must never run
// automatically against a database that might hold real prospect data. This
// guard only runs it on genuine first boot: when Turso is configured and the
// Organization table is still empty. Every later boot sees count > 0 and
// skips, leaving real data untouched.
import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.log("[seed-if-empty] No Turso env vars set — skipping (local dev seeds manually).");
    return;
  }

  const client = createClient({ url, authToken });
  const result = await client.execute(`SELECT COUNT(*) as count FROM "Organization"`);
  const count = Number(result.rows[0]?.count ?? 0);

  if (count > 0) {
    console.log(`[seed-if-empty] ${count} organization(s) already exist — skipping seed.`);
    return;
  }

  console.log("[seed-if-empty] Database is empty — running the seed script once.");
  const res = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

main().catch((err) => {
  console.error("[seed-if-empty] Failed:", err);
  process.exit(1);
});
