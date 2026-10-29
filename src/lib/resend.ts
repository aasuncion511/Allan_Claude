const RESEND_API = "https://api.resend.com/emails";

/**
 * Shared platform-level email sender (Resend) — not per-tenant like PayMongo
 * or GHL. Used for account-level transactional mail (password resets) that
 * must work for every org out of the box, before any client has configured
 * their own GHL integration. Requires RESEND_API_KEY and RESEND_FROM_EMAIL.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendTransactionalEmail(message: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: "Email delivery isn't configured (RESEND_API_KEY/RESEND_FROM_EMAIL missing)." };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend responded ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending email" };
  }
}
