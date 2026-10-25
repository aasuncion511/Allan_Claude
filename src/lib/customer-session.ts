import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "customer_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — renters come back less often than staff

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

function sign(customerId: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(`customer:${customerId}`);
  return hmac.digest("hex");
}

function buildValue(customerId: string): string {
  return `${customerId}.${sign(customerId)}`;
}

function parseValue(value: string | undefined): string | null {
  if (!value) return null;
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const customerId = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  const expected = sign(customerId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return customerId;
}

export async function setCustomerSessionCookie(customerId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, buildValue(customerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearCustomerSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCustomerSessionId(): Promise<string | null> {
  const store = await cookies();
  return parseValue(store.get(SESSION_COOKIE)?.value);
}
