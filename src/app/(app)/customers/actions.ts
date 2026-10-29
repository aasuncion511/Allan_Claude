"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { reviewCustomerDocument } from "@/lib/customer-documents";

function parseCustomerForm(formData: FormData) {
  const birthdayRaw = String(formData.get("birthday") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    driverLicense: String(formData.get("driverLicense") ?? "").trim() || null,
    birthday: birthdayRaw ? new Date(birthdayRaw) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createCustomer(formData: FormData) {
  const { organizationId } = await requirePermission("customers");
  const data = parseCustomerForm(formData);
  const customer = await prisma.customer.create({ data: { ...data, organizationId } });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const { organizationId } = await requirePermission("customers");
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

export async function toggleCustomerSmsOptOut(customerId: string, nextOptOut: boolean) {
  const { organizationId } = await requirePermission("customers");
  await prisma.customer.updateMany({
    where: { id: customerId, organizationId },
    data: {
      smsOptOut: nextOptOut,
      smsOptOutReason: nextOptOut ? "Manually opted out by staff" : null,
    },
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function approveCustomerDocument(documentId: string) {
  const user = await requirePermission("customers");
  const result = await reviewCustomerDocument({
    organizationId: user.organizationId,
    documentId,
    reviewedByUserId: user.id,
    approve: true,
  });
  if (!result.ok) notFound();
  revalidatePath("/customers/documents");
}

export async function rejectCustomerDocument(documentId: string, formData: FormData) {
  const user = await requirePermission("customers");
  const rejectionReason = String(formData.get("rejectionReason") ?? "").trim();
  const result = await reviewCustomerDocument({
    organizationId: user.organizationId,
    documentId,
    reviewedByUserId: user.id,
    approve: false,
    rejectionReason,
  });
  if (!result.ok) notFound();
  revalidatePath("/customers/documents");
}

export async function deleteCustomer(customerId: string) {
  const { organizationId } = await requirePermission("customers");
  await prisma.customer.deleteMany({ where: { id: customerId, organizationId } });
  revalidatePath("/customers");
  redirect("/customers");
}
