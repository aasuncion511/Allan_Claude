"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { readImageUpload } from "@/lib/image-upload";

export async function updateStorefrontProfile(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();

  const uploadedLogo = await readImageUpload(formData, "logoFile");
  const removeLogo = formData.get("removeLogo") === "on";
  const pastedLogoUrl = field("logoUrlText");
  const logoUrl = removeLogo ? null : (uploadedLogo ?? pastedLogoUrl ?? undefined);

  const uploadedHero = await readImageUpload(formData, "heroImageFile", 3 * 1024 * 1024);
  const removeHeroImage = formData.get("removeHeroImage") === "on";
  const pastedHeroUrl = field("heroImageUrl");
  const heroImageUrl = removeHeroImage ? null : (uploadedHero ?? pastedHeroUrl ?? undefined);

  const themeRaw = String(formData.get("theme") ?? "");
  const theme = (["CLASSIC", "MODERN", "ADVENTURE"] as const).includes(themeRaw as never)
    ? (themeRaw as "CLASSIC" | "MODERN" | "ADVENTURE")
    : undefined;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(name ? { name } : {}),
      ...(theme ? { theme } : {}),
      tagline: field("tagline"),
      aboutText: field("aboutText"),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(heroImageUrl !== undefined ? { heroImageUrl } : {}),
      contactPhone: field("contactPhone"),
      contactEmail: field("contactEmail"),
      address: field("address"),
      facebookUrl: field("facebookUrl"),
      instagramUrl: field("instagramUrl"),
      tiktokUrl: field("tiktokUrl"),
      requirementsText: field("requirementsText"),
    },
  });

  revalidatePath("/settings/storefront");
}

export async function updatePaymentSettings(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const clearKeys = formData.get("clearPaymongoKeys") === "on";
  // Secret fields are never pre-filled back into the page (see settings page),
  // so a blank submission means "leave unchanged", not "clear it" — otherwise
  // every save that doesn't re-type the key would silently wipe it. The
  // explicit checkbox above is the only way to intentionally disconnect.
  const secretField = (name: string) => {
    if (clearKeys) return null;
    const value = String(formData.get(name) ?? "").trim();
    return value || undefined;
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(secretField("paymongoSecretKey") !== undefined
        ? { paymongoSecretKey: secretField("paymongoSecretKey") }
        : {}),
      paymongoPublicKey: clearKeys ? null : field("paymongoPublicKey"),
      ...(secretField("paymongoWebhookSecret") !== undefined
        ? { paymongoWebhookSecret: secretField("paymongoWebhookSecret") }
        : {}),
      paymongoLiveMode: clearKeys ? false : formData.get("paymongoLiveMode") === "on",
    },
  });

  revalidatePath("/settings/storefront");
}

/** v2 free-hold + category reservation pricing — see src/lib/reservation-pricing.ts.
 *  Centrally configured here, never a front-end constant. */
export async function updateReservationPricing(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const positiveNumber = (name: string, fallback: number) => {
    const value = Number(formData.get(name));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      holdWindowSeconds: Math.max(60, Math.round(positiveNumber("holdWindowSeconds", 1500))),
      sedanReservationFee: positiveNumber("sedanReservationFee", 800),
      suvReservationFee: positiveNumber("suvReservationFee", 1000),
      pickupReservationFee: positiveNumber("pickupReservationFee", 1000),
      securityDepositAmount: positiveNumber("securityDepositAmount", 2000),
    },
  });

  revalidatePath("/settings/storefront");
}

export async function updateBookingAddOns(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const num = (name: string) => {
    const value = Number(formData.get(name));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      offersDriverService: formData.get("offersDriverService") === "on",
      driverFeePerDay: num("driverFeePerDay"),
      deliveryFeeAmount: num("deliveryFeeAmount"),
      dropoffFeeAmount: num("dropoffFeeAmount"),
      carwashFeeAmount: num("carwashFeeAmount"),
      excessHourlyRate: num("excessHourlyRate"),
    },
  });

  revalidatePath("/settings/storefront");
}

export async function updateLegalSettings(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      termsAndConditionsText: field("termsAndConditionsText"),
    },
  });

  revalidatePath("/settings/storefront");
}

export async function updateSmsNurtureSettings(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const months = Number(formData.get("smsInactivityMonths") ?? 24);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      smsRemindersEnabled: formData.get("smsRemindersEnabled") === "on",
      smsBirthdayGreetingsEnabled: formData.get("smsBirthdayGreetingsEnabled") === "on",
      smsHolidayGreetingsEnabled: formData.get("smsHolidayGreetingsEnabled") === "on",
      smsInactivityMonths: Number.isFinite(months) && months > 0 ? Math.round(months) : 24,
    },
  });

  revalidatePath("/settings/storefront");
}

export async function updateGhlSettings(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const clearToken = formData.get("clearGhlToken") === "on";
  // ghlApiToken is never pre-filled back into the page — a blank submission
  // means "leave unchanged" unless the explicit clear checkbox is ticked.
  const tokenValue = clearToken ? null : String(formData.get("ghlApiToken") ?? "").trim() || undefined;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ghlLocationId: field("ghlLocationId"),
      ...(tokenValue !== undefined ? { ghlApiToken: tokenValue } : {}),
    },
  });

  revalidatePath("/settings/storefront");
}

export async function createFaq(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) return;

  const count = await prisma.faq.count({ where: { organizationId } });
  await prisma.faq.create({ data: { organizationId, question, answer, order: count } });
  revalidatePath("/settings/storefront");
}

export async function deleteFaq(faqId: string) {
  const { organizationId } = await requirePermission("storefrontSettings");
  await prisma.faq.deleteMany({ where: { id: faqId, organizationId } });
  revalidatePath("/settings/storefront");
  redirect("/settings/storefront");
}

export async function createTestimonial(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");
  const authorName = String(formData.get("authorName") ?? "").trim();
  const quote = String(formData.get("quote") ?? "").trim();
  if (!authorName || !quote) return;

  const count = await prisma.testimonial.count({ where: { organizationId } });
  await prisma.testimonial.create({
    data: { organizationId, authorName, quote, order: count },
  });
  revalidatePath("/settings/storefront");
}

export async function deleteTestimonial(testimonialId: string) {
  const { organizationId } = await requirePermission("storefrontSettings");
  await prisma.testimonial.deleteMany({ where: { id: testimonialId, organizationId } });
  revalidatePath("/settings/storefront");
  redirect("/settings/storefront");
}
