"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function parseCustomerForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    driverLicense: String(formData.get("driverLicense") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createCustomer(formData: FormData) {
  await requireUser();
  const data = parseCustomerForm(formData);
  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  await requireUser();
  const data = parseCustomerForm(formData);
  await prisma.customer.update({ where: { id: customerId }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  await requireUser();
  await prisma.customer.delete({ where: { id: customerId } });
  revalidatePath("/customers");
  redirect("/customers");
}
