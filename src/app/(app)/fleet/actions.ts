"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function parseVehicleForm(formData: FormData) {
  return {
    plateNumber: String(formData.get("plateNumber") ?? "").trim(),
    make: String(formData.get("make") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    year: Number(formData.get("year")),
    color: String(formData.get("color") ?? "").trim() || null,
    photoUrl: String(formData.get("photoUrl") ?? "").trim() || null,
    dailyRate: Number(formData.get("dailyRate")),
    status: String(formData.get("status") ?? "AVAILABLE") as
      | "AVAILABLE"
      | "BOOKED"
      | "RESERVED"
      | "MAINTENANCE"
      | "OUT_OF_SERVICE",
    odometer: Number(formData.get("odometer") ?? 0),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createVehicle(formData: FormData) {
  await requireUser();
  const data = parseVehicleForm(formData);
  const vehicle = await prisma.vehicle.create({ data });
  revalidatePath("/fleet");
  redirect(`/fleet/${vehicle.id}`);
}

export async function updateVehicle(vehicleId: string, formData: FormData) {
  await requireUser();
  const data = parseVehicleForm(formData);
  await prisma.vehicle.update({ where: { id: vehicleId }, data });
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${vehicleId}`);
  redirect(`/fleet/${vehicleId}`);
}

export async function deleteVehicle(vehicleId: string) {
  await requireUser();
  await prisma.vehicle.delete({ where: { id: vehicleId } });
  revalidatePath("/fleet");
  redirect("/fleet");
}
