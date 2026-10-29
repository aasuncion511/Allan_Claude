import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { hasPermission, type PermissionKey } from "@/lib/permissions";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** Random 10-char temp password for "forgot password" resets — excludes
 *  ambiguous characters (0/O/1/l/I) since it's typed in from an email. */
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export function generateTempPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return out;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Convenience for actions/queries that only need the current org's id. */
export async function requireOrgId(): Promise<string> {
  const user = await requireUser();
  return user.organizationId;
}

/** Gate a page or action behind a permission; OWNER always passes. */
export async function requirePermission(key: PermissionKey) {
  const user = await requireUser();
  if (!hasPermission(user, key)) redirect("/403");
  return user;
}

/** Owner-only, no staff permission can unlock this — used for rental-payment
 *  refunds (a deliberate exception to the published policy) and anything
 *  else that must never be delegable. Security-deposit refunds are a
 *  separate, routine action gated by "bookings" instead. */
export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/403");
  return user;
}
