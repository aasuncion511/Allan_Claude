const GHL_API = "https://services.leadconnectorhub.com";
const GHL_VERSION = "2021-07-28";

type GhlConfig = { locationId: string; apiToken: string };

/**
 * Best-effort contact sync to the organization's own GoHighLevel location.
 * Never throws — a CRM hiccup should never block a signup or booking.
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
): Promise<void> {
  try {
    const [firstName, ...rest] = contact.name.trim().split(" ");
    await fetch(`${GHL_API}/contacts/upsert`, {
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
  } catch {
    // Swallow — CRM sync is a nice-to-have, never a hard dependency.
  }
}

export function isGhlConfigured(org: { ghlLocationId: string | null; ghlApiToken: string | null }): boolean {
  return Boolean(org.ghlLocationId && org.ghlApiToken);
}
