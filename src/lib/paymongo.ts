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

export type CheckoutSessionStatus = {
  id: string;
  /** Derived from the most recent payment attached to the session, if any. */
  paymentState: "paid" | "pending" | "processing" | "failed" | "unpaid";
  paymentId: string | null;
};

function derivePaymentState(json: {
  data: { attributes: { payments?: { id: string; attributes: { status: string } }[] } };
}): CheckoutSessionStatus["paymentState"] {
  const payments = json.data.attributes.payments ?? [];
  if (payments.length === 0) return "unpaid";
  // Most recent payment attempt wins — PayMongo appends new attempts to this array.
  const latest = payments[payments.length - 1];
  switch (latest.attributes.status) {
    case "paid":
      return "paid";
    case "pending":
      return "pending";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    default:
      return "unpaid";
  }
}

/**
 * Retrieves the current state of a checkout session — used for webhook
 * reconciliation and before/after expiring, since redirect URLs and even
 * webhooks can't be fully trusted alone (delayed/duplicate delivery).
 * See https://developers.paymongo.com/reference/retrieve-a-checkout-session
 */
export async function getCheckoutSession(
  secretKey: string,
  checkoutSessionId: string
): Promise<CheckoutSessionStatus> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions/${checkoutSessionId}`, {
    headers: { Authorization: authHeader(secretKey) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMongo get checkout session failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  const payments = json.data.attributes.payments ?? [];
  return {
    id: json.data.id,
    paymentState: derivePaymentState(json),
    paymentId: payments.length > 0 ? payments[payments.length - 1].id : null,
  };
}

/**
 * Explicitly expires a checkout session (PayMongo sessions never
 * auto-expire). PayMongo refuses this when a payment on the session is
 * already paid, pending, or processing — callers MUST treat a refusal as
 * "do not release inventory yet", never force it.
 * See https://developers.paymongo.com/reference/expire-a-checkout-session
 */
export async function expireCheckoutSession(
  secretKey: string,
  checkoutSessionId: string
): Promise<{ expired: true } | { expired: false; reason: string; paymentState: CheckoutSessionStatus["paymentState"] }> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions/${checkoutSessionId}/expire`, {
    method: "POST",
    headers: { Authorization: authHeader(secretKey) },
  });

  if (res.ok) {
    // Verify, don't just trust the 200 — confirm no payment slipped in during the race.
    const status = await getCheckoutSession(secretKey, checkoutSessionId);
    if (status.paymentState === "paid" || status.paymentState === "pending" || status.paymentState === "processing") {
      return { expired: false, reason: "Payment landed during expiry — not released.", paymentState: status.paymentState };
    }
    return { expired: true };
  }

  const body = await res.text().catch(() => "");
  try {
    const status = await getCheckoutSession(secretKey, checkoutSessionId);
    return { expired: false, reason: `PayMongo refused expiry (${res.status}): ${body.slice(0, 200)}`, paymentState: status.paymentState };
  } catch {
    return { expired: false, reason: `PayMongo refused expiry (${res.status}): ${body.slice(0, 200)}`, paymentState: "unpaid" };
  }
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

export type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer" | "others";

export type RefundResult = {
  id: string;
  status: string;
};

/**
 * Issues a refund against a specific payment (not a checkout session —
 * PayMongo refunds are created against the underlying payment id, which
 * getCheckoutSession resolves). Used only by the admin refund-exception
 * workflow (src/lib/refunds.ts) — the published reservation policy is
 * non-refundable by default; this is the deliberate override path.
 * See https://developers.paymongo.com/reference/the-refund-object
 */
export async function createRefund(
  secretKey: string,
  params: { paymentId: string; amountCentavos: number; reason: RefundReason; notes?: string }
): Promise<RefundResult> {
  const res = await fetch(`${PAYMONGO_API}/refunds`, {
    method: "POST",
    headers: {
      Authorization: authHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: params.amountCentavos,
          payment_id: params.paymentId,
          reason: params.reason,
          notes: params.notes,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMongo refund failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return { id: json.data.id, status: json.data.attributes.status };
}
