"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";

export async function createExpense(formData: FormData) {
  const organizationId = await requireOrgId();
  const vehicleId = String(formData.get("vehicleId"));
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
  });
  if (!vehicle) notFound();

  await prisma.expense.create({
    data: {
      organizationId,
      vehicleId,
      category: String(formData.get("category")) as
        | "INSURANCE"
        | "REGISTRATION"
        | "CLEANING"
        | "PARKING_TOLLS"
        | "OTHER",
      amount: Number(formData.get("amount")),
      date: new Date(String(formData.get("date"))),
      description: String(formData.get("description") ?? "").trim() || null,
      vendor: String(formData.get("vendor") ?? "").trim() || null,
    },
  });
  revalidatePath("/expenses");
  revalidatePath(`/fleet/${vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/expenses");
}

export async function deleteExpense(expenseId: string) {
  const organizationId = await requireOrgId();
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, organizationId },
  });
  if (!expense) notFound();
  await prisma.expense.deleteMany({ where: { id: expenseId, organizationId } });
  revalidatePath("/expenses");
  revalidatePath(`/fleet/${expense.vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/expenses");
}
