"use server";

import { prisma } from "@/lib/db";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { uniqueOrgSlug } from "@/lib/slug";
import { checkSignupRateLimit } from "@/lib/rate-limit";
import { seedDemoOrgData } from "@/lib/demo-seed";

const DEMO_HOURS = 72;

export type DemoState =
  | { error: string }
  | { success: true; email: string; tempPassword: string; slug: string; expiresAt: string }
  | undefined;

export async function startDemoAction(
  _prevState: DemoState,
  formData: FormData
): Promise<DemoState> {
  const limitError = await checkSignupRateLimit("demo");
  if (limitError) return { error: limitError };

  const name = String(formData.get("name") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!name || !email) {
    return { error: "Name and email are required." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try logging in instead." };
  }

  const orgName = companyName || `${name}'s Demo Fleet`;
  const expiresAt = new Date(Date.now() + DEMO_HOURS * 60 * 60 * 1000);

  const organization = await prisma.organization.create({
    data: {
      name: orgName,
      slug: await uniqueOrgSlug(orgName),
      isDemo: true,
      subscriptionStatus: "TRIALING",
      trialEndsAt: expiresAt,
      tagline: "See how easy fleet management can be.",
    },
  });

  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name,
      email,
      passwordHash: await hashPassword(tempPassword),
      role: "OWNER",
    },
  });

  await seedDemoOrgData(organization.id);
  await setSessionCookie(user.id);

  return {
    success: true,
    email,
    tempPassword,
    slug: organization.slug,
    expiresAt: expiresAt.toISOString(),
  };
}
