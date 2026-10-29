"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/customer-auth";
import { setCustomerSessionCookie, clearCustomerSessionCookie } from "@/lib/customer-session";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";
import { checkLoginRateLimit, checkSignupRateLimit } from "@/lib/rate-limit";

export type CustomerAuthState = { error?: string } | undefined;

export async function customerSignupAction(
  slug: string,
  _prevState: CustomerAuthState,
  formData: FormData
): Promise<CustomerAuthState> {
  const limitError = await checkSignupRateLimit(`customer:${slug}`);
  if (limitError) return { error: limitError };

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
  const limitError = await checkLoginRateLimit(`customer:${slug}`);
  if (limitError) return { error: limitError };

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

export type SaveContactState = { error?: string; name?: string; email?: string; phone?: string; address?: string } | undefined;

/**
 * Silently creates or updates the renter's contact record as soon as they
 * give their details on a booking — no explicit "sign up" step, no password.
 * The signed session cookie set here is what lets them come back later.
 */
export async function saveContactAction(
  slug: string,
  _prevState: SaveContactState,
  formData: FormData
): Promise<SaveContactState> {
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { error: "This rental company could not be found." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name || !email || !phone || !address) {
    return { error: "All fields are required." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const existing = await prisma.customer.findUnique({
    where: { organizationId_email: { organizationId: org.id, email } },
  });

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: { name, phone, address },
      })
    : await prisma.customer.create({
        data: { organizationId: org.id, name, email, phone, address },
      });

  const ghlCreds = await prisma.organization.findUnique({
    where: { id: org.id },
    select: { ghlLocationId: true, ghlApiToken: true },
  });
  if (ghlCreds && isGhlConfigured(ghlCreds)) {
    await upsertGhlContact(
      { locationId: ghlCreds.ghlLocationId!, apiToken: ghlCreds.ghlApiToken! },
      { name, email, phone, tags: ["website-lead"] }
    );
  }

  await setCustomerSessionCookie(customer.id);
  return { name: customer.name, email: customer.email ?? "", phone: customer.phone, address: customer.address ?? "" };
}
