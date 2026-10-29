"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, requireCustomerForOrg } from "@/lib/customer-auth";
import { generateTempPassword } from "@/lib/auth";
import { setCustomerSessionCookie, clearCustomerSessionCookie } from "@/lib/customer-session";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";
import { checkLoginRateLimit, checkSignupRateLimit, checkPasswordResetRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail, isResendConfigured } from "@/lib/resend";

export type CustomerAuthState = { error?: string } | undefined;
export type CustomerResetState = { error?: string; success?: boolean } | undefined;

export async function customerRequestPasswordResetAction(
  slug: string,
  _prevState: CustomerResetState,
  formData: FormData
): Promise<CustomerResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const limitError = await checkPasswordResetRateLimit(`customer:${slug}`);
  if (limitError) return { error: limitError };

  if (!isResendConfigured()) {
    return { error: "Password reset email isn't set up yet — contact us directly for help." };
  }

  const org = await getPublicOrgBySlug(slug);
  if (org) {
    const customer = await prisma.customer.findFirst({
      where: { organizationId: org.id, email, passwordHash: { not: null } },
    });
    if (customer && customer.email) {
      const tempPassword = generateTempPassword();
      const result = await sendTransactionalEmail({
        to: customer.email,
        subject: `Your ${org.name} account password has been reset`,
        html: `<p>Hi ${customer.name},</p><p>Your password has been reset. Your new temporary password is:</p><p style="font-size:18px;font-weight:bold;letter-spacing:1px;">${tempPassword}</p><p>Sign in with it at your next visit, then change it from your account page.</p><p>If you didn't request this, please contact us.</p>`,
      });
      if (result.ok) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { passwordHash: await hashPassword(tempPassword) },
        });
      } else {
        console.error("[customer-forgot-password] send failed:", result.error);
      }
    }
  }

  return { success: true };
}

export type CustomerChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function customerChangeOwnPasswordAction(
  slug: string,
  _prevState: CustomerChangePasswordState,
  formData: FormData
): Promise<CustomerChangePasswordState> {
  const org = await getPublicOrgBySlug(slug);
  if (!org) return { error: "This rental company could not be found." };
  const customer = await requireCustomerForOrg(org.id, slug);
  if (!customer.passwordHash) {
    return { error: "This account doesn't have a password set yet." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const ok = await verifyPassword(currentPassword, customer.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New password and confirmation don't match." };

  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return { success: true };
}

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
