"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export async function updateStorefrontProfile(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      tagline: field("tagline"),
      aboutText: field("aboutText"),
      logoUrl: field("logoUrl"),
      heroImageUrl: field("heroImageUrl"),
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
  const reservationFeeAmount = Number(formData.get("reservationFeeAmount") ?? 500);
  const holdFeeAmount = Number(formData.get("holdFeeAmount") ?? 350);

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      paymongoSecretKey: field("paymongoSecretKey"),
      paymongoPublicKey: field("paymongoPublicKey"),
      paymongoWebhookSecret: field("paymongoWebhookSecret"),
      paymongoLiveMode: formData.get("paymongoLiveMode") === "on",
      reservationFeeAmount: Number.isFinite(reservationFeeAmount) ? reservationFeeAmount : 500,
      holdFeeAmount: Number.isFinite(holdFeeAmount) ? holdFeeAmount : 350,
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

export async function updateGhlSettings(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const field = (name: string) => String(formData.get(name) ?? "").trim() || null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ghlLocationId: field("ghlLocationId"),
      ghlApiToken: field("ghlApiToken"),
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
