/**
 * Single source of truth for the v2 free-hold + reservation-payment
 * business rules (PromdiPreneur Car Rental OS v2 handoff, 2026-10-27).
 * Never duplicate these numbers/window in frontend code — read them from
 * the organization record, which is itself seeded from these exact
 * approved defaults and editable only by the owner/admin.
 */

export type OrgReservationConfig = {
  holdWindowSeconds: number;
  sedanReservationFee: number;
  suvReservationFee: number;
  pickupReservationFee: number;
};

export type ReservationCategory = "SEDAN" | "SUV" | "PICKUP";

/** Null when the vehicle has no reservationCategory set — callers must
 *  block the online reservation flow with a clear message in that case,
 *  never guess a price. */
export function getReservationFee(
  org: OrgReservationConfig,
  category: ReservationCategory | null
): number | null {
  switch (category) {
    case "SEDAN":
      return org.sedanReservationFee;
    case "SUV":
      return org.suvReservationFee;
    case "PICKUP":
      return org.pickupReservationFee;
    default:
      return null;
  }
}

export function getHoldWindowMs(org: OrgReservationConfig): number {
  return org.holdWindowSeconds * 1000;
}
