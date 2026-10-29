import { headers } from "next/headers";

/**
 * In-memory sliding-window rate limiter for auth endpoints (login, signup).
 * Deliberately simple: no Redis/external store, so counts reset on deploy
 * and aren't shared across multiple server instances — a real limitation,
 * but still a meaningful improvement over the previous *zero* protection
 * on login/signup, and costs nothing to run on this single-instance
 * deployment. Revisit with a shared store (e.g. Upstash Redis) if this app
 * ever runs multiple instances behind a load balancer.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function cleanupIfLarge(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupIfLarge(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

/** Best-effort client IP, same header precedence as getBaseUrl(). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function friendlyRetry(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}

/** Rate-limit a login attempt — keyed by IP, so one attacker can't just
 *  rotate through target emails to dodge a per-account limit. */
export async function checkLoginRateLimit(scope: string): Promise<string | null> {
  const ip = await clientIp();
  const result = checkRateLimit(`login:${scope}:${ip}`, 10, 10 * 60 * 1000);
  if (result.allowed) return null;
  return `Too many login attempts. Please try again in ${friendlyRetry(result.retryAfterSeconds)}.`;
}

/** Rate-limit a signup attempt — tighter, since signups are rarer legitimately. */
export async function checkSignupRateLimit(scope: string): Promise<string | null> {
  const ip = await clientIp();
  const result = checkRateLimit(`signup:${scope}:${ip}`, 5, 60 * 60 * 1000);
  if (result.allowed) return null;
  return `Too many signup attempts from this connection. Please try again in ${friendlyRetry(result.retryAfterSeconds)}.`;
}

/** Rate-limit a password-reset request — each one actually rewrites a
 *  password and sends an email, so keep this tight. */
export async function checkPasswordResetRateLimit(scope: string): Promise<string | null> {
  const ip = await clientIp();
  const result = checkRateLimit(`reset:${scope}:${ip}`, 5, 60 * 60 * 1000);
  if (result.allowed) return null;
  return `Too many reset requests from this connection. Please try again in ${friendlyRetry(result.retryAfterSeconds)}.`;
}
