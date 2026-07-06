"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getStripe, PLANS, type PlanId } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";

export type BillingActionState = { error?: string } | undefined;

export async function startCheckout(
  _prevState: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    return { error: "Only the account owner can manage billing." };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      error:
        "Billing isn't configured yet. Set STRIPE_SECRET_KEY and plan price IDs in the environment.",
    };
  }

  const planId = String(formData.get("planId")) as PlanId;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan?.priceId) {
    return { error: "That plan isn't available yet." };
  }

  const org = user.organization;
  let stripeCustomerId = org.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: user.email,
      metadata: { organizationId: org.id },
    });
    stripeCustomerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId },
    });
  }

  const baseUrl = await getBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings/billing?checkout=success`,
    cancel_url: `${baseUrl}/settings/billing?checkout=cancelled`,
    metadata: { organizationId: org.id },
  });

  if (!session.url) {
    return { error: "Could not start checkout. Please try again." };
  }
  redirect(session.url);
}

export async function openBillingPortal(): Promise<BillingActionState> {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    return { error: "Only the account owner can manage billing." };
  }

  const stripe = getStripe();
  if (!stripe || !user.organization.stripeCustomerId) {
    return { error: "No billing account found yet. Subscribe to a plan first." };
  }

  const baseUrl = await getBaseUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.organization.stripeCustomerId,
    return_url: `${baseUrl}/settings/billing`,
  });
  redirect(portalSession.url);
}
