"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function createFuelLog(vehicleId: string, formData: FormData) {
  await requireUser();
  const odometerRaw = String(formData.get("odometer") ?? "").trim();

  await prisma.fuelLog.create({
    data: {
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
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle && odometer > vehicle.odometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { odometer },
      });
    }
  }

  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/fleet/${vehicleId}`);
}

export async function deleteFuelLog(vehicleId: string, logId: string) {
  await requireUser();
  await prisma.fuelLog.delete({ where: { id: logId } });
  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/fleet/${vehicleId}`);
}
