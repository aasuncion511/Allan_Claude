"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";

export async function createMaintenanceLog(formData: FormData) {
  const organizationId = await requireOrgId();
  const vehicleId = String(formData.get("vehicleId"));
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
  });
  if (!vehicle) notFound();

  const nextDueDateRaw = String(formData.get("nextDueDate") ?? "").trim();
  const nextDueOdometerRaw = String(formData.get("nextDueOdometer") ?? "").trim();
  const odometerRaw = String(formData.get("odometer") ?? "").trim();

  await prisma.maintenanceLog.create({
    data: {
      organizationId,
      vehicleId,
      type: String(formData.get("type") ?? "").trim(),
      date: new Date(String(formData.get("date"))),
      cost: Number(formData.get("cost") ?? 0),
      odometer: odometerRaw ? Number(odometerRaw) : null,
      vendor: String(formData.get("vendor") ?? "").trim() || null,
      nextDueDate: nextDueDateRaw ? new Date(nextDueDateRaw) : null,
      nextDueOdometer: nextDueOdometerRaw ? Number(nextDueOdometerRaw) : null,
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

  revalidatePath("/maintenance");
  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/maintenance");
}

export async function deleteMaintenanceLog(logId: string) {
  const organizationId = await requireOrgId();
  const log = await prisma.maintenanceLog.findFirst({
    where: { id: logId, organizationId },
  });
  if (!log) notFound();
  await prisma.maintenanceLog.deleteMany({ where: { id: logId, organizationId } });
  revalidatePath("/maintenance");
  revalidatePath(`/fleet/${log.vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/maintenance");
}
