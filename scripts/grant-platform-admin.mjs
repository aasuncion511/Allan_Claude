// Grants the platform-admin flag (cross-organization access to
// /platform-admin) to whichever user has PLATFORM_ADMIN_EMAIL, if set.
// Never grantable through the app UI — this boot-time script is the only
// path, so a client's own org OWNER can never end up with it by accident.
// Idempotent: safe to run on every boot, no-ops once already granted.
// Raw SQL, not Prisma Client: the generated client is TypeScript and this
// runs as a plain Node script (same reason migrate-turso.mjs avoids it).
import { createClient } from "@libsql/client";
import Database from "better-sqlite3";

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log("[grant-platform-admin] PLATFORM_ADMIN_EMAIL not set — skipping.");
    return;
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    const result = await client.execute({
      sql: `SELECT id, isPlatformAdmin FROM User WHERE email = ?`,
      args: [email],
    });
    const row = result.rows[0];
    if (!row) {
      console.log(`[grant-platform-admin] No user found for ${email} yet — skipping.`);
      return;
    }
    if (row.isPlatformAdmin) {
      console.log(`[grant-platform-admin] ${email} already has platform-admin access.`);
      return;
    }
    await client.execute({
      sql: `UPDATE User SET isPlatformAdmin = 1 WHERE id = ?`,
      args: [row.id],
    });
    console.log(`[grant-platform-admin] Granted platform-admin access to ${email}.`);
  } else {
    const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
    const db = new Database(dbPath);
    const row = db.prepare(`SELECT id, isPlatformAdmin FROM User WHERE email = ?`).get(email);
    if (!row) {
      console.log(`[grant-platform-admin] No user found for ${email} yet — skipping.`);
      return;
    }
    if (row.isPlatformAdmin) {
      console.log(`[grant-platform-admin] ${email} already has platform-admin access.`);
      return;
    }
    db.prepare(`UPDATE User SET isPlatformAdmin = 1 WHERE id = ?`).run(row.id);
    console.log(`[grant-platform-admin] Granted platform-admin access to ${email}.`);
  }
}

main().catch((err) => {
  console.error("[grant-platform-admin] Failed:", err);
  process.exit(1);
});
