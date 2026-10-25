"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isVehicleAvailable } from "@/lib/availability";
import { createCheckoutSession, pesosToCentavos } from "@/lib/paymongo";
import { getBaseUrl } from "@/lib/url";

export type BookingCheckoutState = { error?: string } | undefined;

export async function createBookingCheckout(
  slug: string,
  vehicleId: string,
  _prevState: BookingCheckoutState,
  formData: FormData
): Promise<BookingCheckoutState> {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect(`/r/${slug}/login?redirectTo=${encodeURIComponent(`/r/${slug}/book/${vehicleId}`)}`);
  }

  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return { error: "Please choose a valid date range." };
  }
  if (startDate < new Date(new Date().toDateString())) {
    return { error: "Start date can't be in the past." };
  }

  const org = await prisma.organization.findUnique({ where: { id: customer.organizationId } });
  if (!org || org.slug !== slug) {
    return { error: "This rental company could not be found." };
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId: org.id },
  });
  if (!vehicle) return { error: "This vehicle could not be found." };
  if (vehicle.status === "MAINTENANCE" || vehicle.status === "OUT_OF_SERVICE") {
    return { error: "This unit isn't available for booking right now." };
  }

  const available = await isVehicleAvailable(vehicleId, startDate, endDate);
  if (!available) {
    return { error: "Sorry, this unit is already booked for part of those dates. Please choose different dates." };
  }

  if (!org.paymongoSecretKey) {
    return {
      error:
        "Online payment isn't set up for this rental company yet. Please contact them directly to book.",
    };
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const totalAmount = vehicle.dailyRate * days;
  const baseUrl = await getBaseUrl();

  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      secretKey: org.paymongoSecretKey,
      amountCentavos: pesosToCentavos(org.reservationFeeAmount),
      description: `Reservation fee — ${vehicle.year} ${vehicle.make} ${vehicle.model} (${slug})`,
      successUrl: `${baseUrl}/r/${slug}/book/${vehicleId}/confirmed`,
      cancelUrl: `${baseUrl}/r/${slug}/book/${vehicleId}`,
      metadata: {
        organizationId: org.id,
        vehicleId: vehicle.id,
        customerId: customer.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyRate: String(vehicle.dailyRate),
        totalAmount: String(totalAmount),
        reservationFee: String(org.reservationFeeAmount),
      },
    });
    checkoutUrl = session.checkoutUrl;
  } catch {
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }
  redirect(checkoutUrl);
}
