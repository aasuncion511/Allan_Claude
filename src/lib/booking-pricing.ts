export type RentalOption = "SELF_DRIVE" | "WITH_DRIVER";
export type BookingLocationMethod = "GARAGE" | "DELIVERED";

export type PricingInputs = {
  dailyRate: number;
  days: number;
  rentalOption: RentalOption;
  pickupMethod: BookingLocationMethod;
  dropoffMethod: BookingLocationMethod;
  carwashRequested: boolean;
  excessHours: number;
  /** Org-configured fee settings. */
  driverFeePerDay: number;
  deliveryFeeAmount: number;
  dropoffFeeAmount: number;
  carwashFeeAmount: number;
  excessHourlyRate: number;
};

export type PricingBreakdown = {
  carRentalFee: number;
  driverFee: number;
  deliveryFee: number;
  dropoffFee: number;
  carwashFee: number;
  excessTimeFee: number;
  totalAmount: number;
};

/** Deterministic line-item pricing so online payment can stay instant — no manual quoting. */
export function computeBookingPricing(input: PricingInputs): PricingBreakdown {
  const days = Math.max(1, input.days);
  const carRentalFee = input.dailyRate * days;
  const driverFee = input.rentalOption === "WITH_DRIVER" ? input.driverFeePerDay * days : 0;
  const deliveryFee = input.pickupMethod === "DELIVERED" ? input.deliveryFeeAmount : 0;
  const dropoffFee = input.dropoffMethod === "DELIVERED" ? input.dropoffFeeAmount : 0;
  const carwashFee = input.carwashRequested ? input.carwashFeeAmount : 0;
  const excessTimeFee = Math.max(0, input.excessHours) * input.excessHourlyRate;

  const totalAmount = carRentalFee + driverFee + deliveryFee + dropoffFee + carwashFee + excessTimeFee;

  return { carRentalFee, driverFee, deliveryFee, dropoffFee, carwashFee, excessTimeFee, totalAmount };
}

export const PURPOSE_OF_TRAVEL_OPTIONS = [
  "Leisure / Vacation",
  "Business Trip",
  "Airport Transfer",
  "Wedding / Event",
  "Errands / City Use",
  "Other",
] as const;

export const HOW_FOUND_US_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "Google Search",
  "Referral from Friend/Family",
  "Repeat Customer",
  "Other",
] as const;
