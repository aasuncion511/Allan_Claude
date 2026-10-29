import { prisma } from "@/lib/db";
import { readImageUploads } from "@/lib/image-upload";

export type InspectionTypeValue = "RELEASE" | "RETURN";

export async function recordInspection(params: {
  organizationId: string;
  bookingId: string;
  type: InspectionTypeValue;
  performedByUserId: string;
  formData: FormData;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, organizationId: params.organizationId },
  });
  if (!booking) return { ok: false, error: "Booking not found." };

  const existing = await prisma.bookingInspection.findUnique({
    where: { bookingId_type: { bookingId: params.bookingId, type: params.type } },
  });
  if (existing) {
    return { ok: false, error: `A ${params.type.toLowerCase()} inspection is already on file for this booking.` };
  }

  const odometerRaw = String(params.formData.get("odometer") ?? "").trim();
  const odometer = odometerRaw ? Number(odometerRaw) : null;
  const fuelLevel = String(params.formData.get("fuelLevel") ?? "").trim() || null;
  const notes = String(params.formData.get("notes") ?? "").trim() || null;
  const photos = await readImageUploads(params.formData, "photos");

  await prisma.bookingInspection.create({
    data: {
      organizationId: params.organizationId,
      bookingId: params.bookingId,
      type: params.type,
      odometer: odometer !== null && Number.isFinite(odometer) ? odometer : null,
      fuelLevel,
      notes,
      photos,
      performedByUserId: params.performedByUserId,
    },
  });

  // A return inspection can also flag a damage/cleaning charge — create it as
  // a normal BookingCharge rather than duplicating payment-collection logic;
  // staff then collect it the same way as any other charge.
  if (params.type === "RETURN") {
    const chargeAmountRaw = String(params.formData.get("damageChargeAmount") ?? "").trim();
    const chargeAmount = chargeAmountRaw ? Number(chargeAmountRaw) : 0;
    const chargeDescription = String(params.formData.get("damageChargeDescription") ?? "").trim();
    if (chargeAmount > 0 && chargeDescription) {
      await prisma.bookingCharge.create({
        data: {
          organizationId: params.organizationId,
          bookingId: params.bookingId,
          description: chargeDescription,
          amount: chargeAmount,
          status: "PENDING",
          recordedByUserId: params.performedByUserId,
        },
      });
    }
  }

  return { ok: true };
}
