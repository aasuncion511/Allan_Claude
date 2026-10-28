export const CHARGE_REASONS = [
  { value: "balance_due", label: "Balance due" },
  { value: "damage", label: "Damage fee" },
  { value: "late_return", label: "Late return fee" },
  { value: "fuel", label: "Fuel" },
  { value: "cleaning", label: "Cleaning fee" },
  { value: "other", label: "Other" },
] as const;

export type ChargeReasonValue = (typeof CHARGE_REASONS)[number]["value"];

export function chargeReasonLabel(value: string): string {
  return CHARGE_REASONS.find((r) => r.value === value)?.label ?? value;
}

/** Builds the stored charge description from a dropdown reason + optional
 *  free-text detail — "Other" requires the detail text to stand on its own. */
export function composeChargeDescription(reasonValue: string, detail: string): string {
  const label = chargeReasonLabel(reasonValue);
  const trimmedDetail = detail.trim();
  if (reasonValue === "other") return trimmedDetail || "Other";
  return trimmedDetail ? `${label} — ${trimmedDetail}` : label;
}
