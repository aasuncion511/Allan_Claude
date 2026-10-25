const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export type CheckoutSessionParams = {
  secretKey: string;
  amountCentavos: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutSessionResult = {
  id: string;
  checkoutUrl: string;
};

/**
 * Creates a PayMongo Checkout Session on the organization's own PayMongo
 * account (their secret key — we never touch their money). See
 * https://developers.paymongo.com/reference/the-checkout-session-object
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(params.secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: params.description,
          line_items: [
            {
              currency: "PHP",
              amount: params.amountCentavos,
              description: params.description,
              name: "Reservation fee",
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card"],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          metadata: params.metadata,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMongo checkout session failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return {
    id: json.data.id,
    checkoutUrl: json.data.attributes.checkout_url,
  };
}

/**
 * Verifies a PayMongo webhook signature. Header format:
 * "t=<timestamp>,te=<test_signature>,li=<live_signature>"
 * See https://developers.paymongo.com/docs/webhooks#verifying-webhook-signatures
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  live: boolean
): Promise<boolean> {
  const crypto = await import("crypto");
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const timestamp = parts.t;
  const signature = live ? parts.li : parts.te;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}
