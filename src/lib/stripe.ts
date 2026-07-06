import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Returns null when STRIPE_SECRET_KEY isn't set, so local dev works without Stripe configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export type PlanId = "starter" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceId: string | undefined;
  monthlyPrice: number;
  description: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER,
    monthlyPrice: 1499,
    description: "For small rental operations getting off spreadsheets.",
    features: [
      "Up to 15 units",
      "Bookings, CRM, expenses & maintenance",
      "Monthly & yearly dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO,
    monthlyPrice: 3499,
    description: "For growing fleets that need unlimited units and staff.",
    features: [
      "Unlimited units",
      "Everything in Starter",
      "Multiple staff logins",
      "Priority support",
    ],
  },
];

export function getPlanByPriceId(priceId: string | null | undefined): Plan | undefined {
  if (!priceId) return undefined;
  return PLANS.find((p) => p.priceId === priceId);
}
