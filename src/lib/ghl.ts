const GHL_API = "https://services.leadconnectorhub.com";
const GHL_VERSION = "2021-07-28";

type GhlConfig = { locationId: string; apiToken: string };

/**
 * Best-effort contact sync to the organization's own GoHighLevel location.
 * Never throws — a CRM hiccup should never block a signup or booking.
 * Returns the GHL contact id (needed to send it a message) when available.
 * See https://highlevel.stoplight.io/docs/integrations/
 */
export async function upsertGhlContact(
  config: GhlConfig,
  contact: {
    name: string;
    email: string;
    phone?: string;
    tags?: string[];
    source?: string;
  }
): Promise<string | null> {
  try {
    const [firstName, ...rest] = contact.name.trim().split(" ");
    const res = await fetch(`${GHL_API}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: config.locationId,
        firstName,
        lastName: rest.join(" ") || undefined,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags,
        source: contact.source ?? "Fleet Manager storefront",
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.contact?.id ?? json?.id ?? null;
  } catch {
    // Swallow — CRM sync is a nice-to-have, never a hard dependency.
    return null;
  }
}

/**
 * Sends a one-off transactional email to a GHL contact through the
 * organization's own location (Conversations API), reusing the same
 * bring-your-own GHL credentials already configured for CRM sync — no
 * separate email-service account needed.
 *
 * Requires the location's API key/private integration token to include the
 * "Conversations" (conversations/message.write) scope. Returns a result
 * object instead of throwing so callers can persist/display the outcome.
 */
export async function sendGhlEmail(
  config: GhlConfig,
  message: { contactId: string; subject: string; html: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${GHL_API}/conversations/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "Email",
        contactId: message.contactId,
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `GHL responded ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending email" };
  }
}

export function isGhlConfigured(org: { ghlLocationId: string | null; ghlApiToken: string | null }): boolean {
  return Boolean(org.ghlLocationId && org.ghlApiToken);
}
