"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { recordInspection, type InspectionTypeValue } from "@/lib/booking-inspection";

export type InspectionActionState = { error?: string; success?: boolean } | undefined;

export async function recordInspectionAction(
  bookingId: string,
  type: InspectionTypeValue,
  _prevState: InspectionActionState,
  formData: FormData
): Promise<InspectionActionState> {
  const user = await requirePermission("bookings");
  const result = await recordInspection({
    organizationId: user.organizationId,
    bookingId,
    type,
    performedByUserId: user.id,
    formData,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
}
