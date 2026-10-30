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

/** The `isDemo: true` in the where clause is deliberate, not redundant — it
 *  means this can never delete a real client org even if called with the
 *  wrong id (e.g. a stale form after a refresh). Cascades to every row the
 *  demo org owns (vehicles, bookings, customers, etc). */
export async function deleteDemoOrganization(organizationId: string) {
  await requirePlatformAdmin();
  await prisma.organization.deleteMany({
    where: { id: organizationId, isDemo: true },
  });
  revalidatePath("/platform-admin");
}
