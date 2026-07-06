"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { trialEndDate } from "@/lib/subscription";

export type SignupState = { error?: string } | undefined;

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const organization = await prisma.organization.create({
    data: {
      name: companyName,
      subscriptionStatus: "TRIALING",
      trialEndsAt: trialEndDate(),
    },
  });

  const stripe = getStripe();
  if (stripe) {
    try {
      const customer = await stripe.customers.create({
        name: companyName,
        email,
        metadata: { organizationId: organization.id },
      });
      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customer.id },
      });
    } catch {
      // Stripe is optional at signup time; billing pages surface any issue later.
    }
  }

  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "OWNER",
    },
  });

  await setSessionCookie(user.id);
  redirect("/dashboard");
}
