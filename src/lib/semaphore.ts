const SEMAPHORE_API = "https://api.semaphore.co/api/v4/messages";

/**
 * Shared platform-level SMS sender (Semaphore) — not per-tenant like GHL.
 * Fallback path for orgs that haven't configured their own GHL integration,
 * so automated SMS nurture still works out of the box. Requires
 * SEMAPHORE_API_KEY; SEMAPHORE_SENDER_NAME is optional (Semaphore falls back
 * to its default approved sender name when omitted).
 */
export function isSemaphoreConfigured(): boolean {
  return Boolean(process.env.SEMAPHORE_API_KEY);
}

/** Philippine mobile numbers only (Semaphore's coverage) — normalizes common
 * local formats (09xx…, +639xx…, 639xx…) to the 63xxxxxxxxxx form it expects. */
function normalizePhPhone(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("63") && digits.length === 12) return digits;
  if (digits.startsWith("09") && digits.length === 11) return `63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `63${digits}`;
  return null;
}

export async function sendSemaphoreSms(message: {
  to: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "SMS delivery isn't configured (SEMAPHORE_API_KEY missing)." };
  }

  const number = normalizePhPhone(message.to);
  if (!number) {
    return { ok: false, error: `Not a valid PH mobile number: ${message.to}` };
  }

  try {
    const res = await fetch(SEMAPHORE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        number,
        message: message.message,
        ...(process.env.SEMAPHORE_SENDER_NAME ? { sendername: process.env.SEMAPHORE_SENDER_NAME } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Semaphore responded ${res.status}: ${body.slice(0, 300)}` };
    }
    const json = await res.json().catch(() => null);
    // Semaphore returns an array of message objects, or a single error object.
    const first = Array.isArray(json) ? json[0] : json;
    if (first?.status === "Failed") {
      return { ok: false, error: `Semaphore marked the message Failed: ${JSON.stringify(first).slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending SMS" };
  }
}
