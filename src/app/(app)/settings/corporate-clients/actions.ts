"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { generateAccessCode } from "@/lib/corporate-clients";

export async function createCorporateClient(formData: FormData) {
  const { organizationId } = await requirePermission("storefrontSettings");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.corporateClient.create({
    data: {
      organizationId,
      name,
      accessCode: generateAccessCode(),
      contactName: String(formData.get("contactName") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
    },
  });
  revalidatePath("/settings/corporate-clients");
}

export async function toggleCorporateClientActive(clientId: string, active: boolean) {
  const { organizationId } = await requirePermission("storefrontSettings");
  const existing = await prisma.corporateClient.findFirst({ where: { id: clientId, organizationId } });
  if (!existing) notFound();
  await prisma.corporateClient.update({ where: { id: clientId }, data: { active } });
  revalidatePath("/settings/corporate-clients");
}

export async function regenerateAccessCode(clientId: string) {
  const { organizationId } = await requirePermission("storefrontSettings");
  const existing = await prisma.corporateClient.findFirst({ where: { id: clientId, organizationId } });
  if (!existing) notFound();
  await prisma.corporateClient.update({ where: { id: clientId }, data: { accessCode: generateAccessCode() } });
  revalidatePath("/settings/corporate-clients");
}
