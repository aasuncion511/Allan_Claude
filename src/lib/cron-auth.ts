/**
 * Shared auth check for internal cron endpoints (/api/cron/*), hit by an
 * external scheduler since this app has no built-in background job runner.
 * Set CRON_SECRET in the environment, then call with either
 *   Authorization: Bearer <CRON_SECRET>   (preferred)
 *   or  ?secret=<CRON_SECRET>             (for schedulers that can't set headers)
 */
export function isCronAuthorized(req: Request): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${configured}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === configured;
}
