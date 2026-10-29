"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";

export async function suspendOrganization(organizationId: string) {
  await requirePlatformAdmin();
  await prisma.organization.update({
    where: { id: organizationId },
    data: { subscriptionStatus: "CANCELED" },
  });
  revalidatePath("/platform-admin");
}

export async function reactivateOrganization(organizationId: string) {
  await requirePlatformAdmin();
  await prisma.organization.update({
    where: { id: organizationId },
    data: { subscriptionStatus: "ACTIVE" },
  });
  revalidatePath("/platform-admin");
}
