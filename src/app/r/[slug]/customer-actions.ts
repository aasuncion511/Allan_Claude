"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/customer-auth";
import { setCustomerSessionCookie, clearCustomerSessionCookie } from "@/lib/customer-session";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";

export type CustomerAuthState = { error?: string } | undefined;

export async function customerSignupAction(
  slug: string,
  _prevState: CustomerAuthState,
  formData: FormData
): Promise<CustomerAuthState> {
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { error: "This rental company could not be found." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!name || !email || !phone || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.customer.findUnique({
    where: { organizationId_email: { organizationId: org.id, email } },
  });
  if (existing) {
    return existing.passwordHash
      ? { error: "An account with this email already exists. Try signing in instead." }
      : { error: "This email is already on file with us — contact us to link your account." };
  }

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
    },
  });

  const ghlCreds = await prisma.organization.findUnique({
    where: { id: org.id },
    select: { ghlLocationId: true, ghlApiToken: true },
  });
  if (ghlCreds && isGhlConfigured(ghlCreds)) {
    await upsertGhlContact(
      { locationId: ghlCreds.ghlLocationId!, apiToken: ghlCreds.ghlApiToken! },
      { name, email, phone, tags: ["website-signup"] }
    );
  }

  await setCustomerSessionCookie(customer.id);
  redirect(redirectTo || `/r/${slug}/account`);
}

export async function customerLoginAction(
  slug: string,
  _prevState: CustomerAuthState,
  formData: FormData
): Promise<CustomerAuthState> {
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { error: "This rental company could not be found." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  const customer = await prisma.customer.findUnique({
    where: { organizationId_email: { organizationId: org.id, email } },
  });
  if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await setCustomerSessionCookie(customer.id);
  redirect(redirectTo || `/r/${slug}/account`);
}

export async function customerLogoutAction(slug: string) {
  await clearCustomerSessionCookie();
  redirect(`/r/${slug}`);
}
