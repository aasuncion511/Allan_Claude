"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function createMaintenanceLog(formData: FormData) {
  await requireUser();
  const vehicleId = String(formData.get("vehicleId"));
  const nextDueDateRaw = String(formData.get("nextDueDate") ?? "").trim();
  const nextDueOdometerRaw = String(formData.get("nextDueOdometer") ?? "").trim();
  const odometerRaw = String(formData.get("odometer") ?? "").trim();

  await prisma.maintenanceLog.create({
    data: {
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
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle && odometer > vehicle.odometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
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
  await requireUser();
  const log = await prisma.maintenanceLog.delete({ where: { id: logId } });
  revalidatePath("/maintenance");
  revalidatePath(`/fleet/${log.vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/maintenance");
}
