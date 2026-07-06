"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function createExpense(formData: FormData) {
  await requireUser();
  const vehicleId = String(formData.get("vehicleId"));
  await prisma.expense.create({
    data: {
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
  await requireUser();
  const expense = await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath("/expenses");
  revalidatePath(`/fleet/${expense.vehicleId}`);
  revalidatePath("/dashboard");
  redirect("/expenses");
}
