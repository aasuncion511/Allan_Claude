"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";

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
  const organizationId = await requireOrgId();
  const data = parseCustomerForm(formData);
  const customer = await prisma.customer.create({ data: { ...data, organizationId } });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const organizationId = await requireOrgId();
  const data = parseCustomerForm(formData);
  const result = await prisma.customer.updateMany({
    where: { id: customerId, organizationId },
    data,
  });
  if (result.count === 0) notFound();
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string) {
  const organizationId = await requireOrgId();
  await prisma.customer.deleteMany({ where: { id: customerId, organizationId } });
  revalidatePath("/customers");
  redirect("/customers");
}
