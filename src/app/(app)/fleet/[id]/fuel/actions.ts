"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";

export async function createFuelLog(vehicleId: string, formData: FormData) {
  const organizationId = await requireOrgId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
  });
  if (!vehicle) notFound();

  const odometerRaw = String(formData.get("odometer") ?? "").trim();

  await prisma.fuelLog.create({
    data: {
      organizationId,
      vehicleId,
      date: new Date(String(formData.get("date"))),
      liters: Number(formData.get("liters")),
      cost: Number(formData.get("cost")),
      odometer: odometerRaw ? Number(odometerRaw) : null,
      fullTank: formData.get("fullTank") === "on",
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  if (odometerRaw) {
    const odometer = Number(odometerRaw);
    if (odometer > vehicle.odometer) {
      await prisma.vehicle.updateMany({
        where: { id: vehicleId, organizationId },
        data: { odometer },
      });
    }
  }

  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/fleet/${vehicleId}`);
}

export async function deleteFuelLog(vehicleId: string, logId: string) {
  const organizationId = await requireOrgId();
  await prisma.fuelLog.deleteMany({
    where: { id: logId, vehicleId, organizationId },
  });
  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/fleet/${vehicleId}`);
}
