import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { isGhlConfigured, sendGhlEmail, upsertGhlContact } from "@/lib/ghl";
import { formatCurrency, formatDate } from "@/lib/format";

export const DEFAULT_TERMS_AND_CONDITIONS = `1. RENTAL REQUIREMENTS — Renter must present a valid driver's license and at least one other government-issued ID at pickup. The renter must be at least 21 years old.

2. SECURITY & FEES — The amount paid at booking secures the reservation only. A refundable security deposit is also required, payable in cash at pickup/delivery or included in full upon paying the rental in full online. All add-on fees selected at booking (driver, delivery, drop-off, carwash, excess time) are due in full at pickup unless already settled online.

2A. SECURITY DEPOSIT REFUND — The security deposit is refundable in full after turnover of the unit at the end of the rental, provided the vehicle is returned on time, undamaged, and with no outstanding charges (fuel, tolls, violations, excess time). Any amounts owed under this contract will be deducted from the deposit before the remainder is refunded. The refund is released via GCash, bank transfer, or cash, at the renter's choice where available.

3. FUEL POLICY — The vehicle is released with a noted fuel level and must be returned at the same level, or a refueling charge will apply.

4. MILEAGE & USE — The vehicle must be used only for lawful purposes and only by the renter or an approved additional driver. Off-road, racing, towing, and sub-leasing the vehicle are prohibited.

5. DAMAGE & LIABILITY — The renter is responsible for any damage, loss, or theft of the vehicle during the rental period not covered by insurance, including the applicable deductible. Traffic violations, tickets, and tolls incurred during the rental are the renter's responsibility.

6. LATE RETURN — Returning the vehicle later than the agreed drop-off time without prior arrangement incurs an excess-hour charge at the rate on file, and may incur a full additional day's rental.

7. CANCELLATION — Reservation and hold fees are non-refundable once the booking is confirmed, except where required by law or at management's discretion for a documented service failure (e.g. the unit could not be supplied). The security deposit described in Section 2A is not subject to this non-refundable policy — it is always refundable after turnover, net of any amounts owed.

8. ACCEPTANCE — By signing below (electronically or on a physical printout at pickup), the renter acknowledges having read and agreed to these Terms & Conditions in full.`;

export function generateSignatureToken(): string {
  return randomBytes(24).toString("hex");
}

type ConfirmationEmailData = {
  orgName: string;
  orgLogoUrl: string | null;
  orgContactPhone: string | null;
  orgContactEmail: string | null;
  termsAndConditionsText: string | null;
  vehicleLabel: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  pickupMethod: string;
  pickupLocation: string | null;
  dropoffMethod: string;
  dropoffLocation: string | null;
  totalAmount: number;
  amountPaid: number;
  driverFee: number;
  deliveryFee: number;
  dropoffFee: number;
  carwashFee: number;
  excessTimeFee: number;
  kind: "reservation" | "hold";
  signUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildConfirmationEmailHtml(data: ConfirmationEmailData): string {
  const addOnFees =
    data.driverFee + data.deliveryFee + data.dropoffFee + data.carwashFee + data.excessTimeFee;
  const carRentalFee = data.totalAmount - addOnFees;
  const balanceDue = Math.max(0, data.totalAmount - data.amountPaid);
  const terms = escapeHtml(data.termsAndConditionsText?.trim() || DEFAULT_TERMS_AND_CONDITIONS).replace(
    /\n/g,
    "<br/>"
  );

  const row = (label: string, amount: number) =>
    amount > 0
      ? `<tr><td style="padding:6px 0;color:#68766E;">${label}</td><td style="padding:6px 0;text-align:right;">${formatCurrency(
          amount
        )}</td></tr>`
      : "";

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#172E25;">
    <div style="background:#092E22;padding:24px;text-align:center;">
      ${
        data.orgLogoUrl
          ? `<img src="${data.orgLogoUrl}" alt="${escapeHtml(data.orgName)}" style="max-height:48px;" />`
          : `<span style="color:#fff;font-size:20px;font-weight:bold;">${escapeHtml(data.orgName)}</span>`
      }
    </div>
    <div style="padding:24px;">
      <h1 style="font-size:20px;margin:0 0 8px;">Booking Confirmed — Payment Received</h1>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>
        We've received and verified your ${
          data.kind === "hold" ? "hold" : "reservation"
        } payment for <strong>${escapeHtml(data.vehicleLabel)}</strong>. Here are your booking details,
        payment summary, and rental Terms &amp; Conditions.
      </p>

      <h2 style="font-size:15px;margin:24px 0 8px;">Trip Details</h2>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#68766E;width:40%;">Pick-up</td><td style="padding:4px 0;">${formatDate(
          data.startDate
        )}${
          data.pickupMethod === "DELIVERED" ? ` — delivered to ${escapeHtml(data.pickupLocation ?? "")}` : " — at garage"
        }</td></tr>
        <tr><td style="padding:4px 0;color:#68766E;">Drop-off</td><td style="padding:4px 0;">${formatDate(
          data.endDate
        )}${
          data.dropoffMethod === "DELIVERED" ? ` — ${escapeHtml(data.dropoffLocation ?? "")}` : " — at garage"
        }</td></tr>
      </table>

      <h2 style="font-size:15px;margin:24px 0 8px;">E-Invoice</h2>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#68766E;">Car Rental Fee</td><td style="padding:6px 0;text-align:right;">${formatCurrency(
          carRentalFee
        )}</td></tr>
        ${row("Driver Fee", data.driverFee)}
        ${row("Delivery Fee", data.deliveryFee)}
        ${row("Drop-off Fee", data.dropoffFee)}
        ${row("Carwash Fee", data.carwashFee)}
        ${row("Excess Time Fee", data.excessTimeFee)}
        <tr style="border-top:1px solid #E1E6DF;">
          <td style="padding:8px 0;font-weight:bold;">Total Amount</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">${formatCurrency(data.totalAmount)}</td>
        </tr>
        <tr><td style="padding:4px 0;color:#18B957;">Amount Paid</td><td style="padding:4px 0;text-align:right;color:#18B957;">${formatCurrency(
          data.amountPaid
        )}</td></tr>
        <tr><td style="padding:4px 0;font-weight:bold;">Remaining Balance</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${formatCurrency(
          balanceDue
        )}</td></tr>
      </table>
      <p style="font-size:12px;color:#68766E;margin-top:8px;">
        This amount does not include any additional charges (e.g. excess mileage, damage, fuel, traffic violations)
        that may apply upon vehicle return, and is <strong>not yet final</strong> until the unit is returned and inspected.
      </p>

      <h2 style="font-size:15px;margin:24px 0 8px;">Terms &amp; Conditions</h2>
      <div style="font-size:12px;line-height:1.6;color:#172E25;background:#F7F7F3;border:1px solid #E1E6DF;border-radius:8px;padding:16px;max-height:260px;overflow:auto;">
        ${terms}
      </div>

      <p style="margin-top:20px;">
        Please review and sign the Terms &amp; Conditions above before pickup — electronically using the button
        below, or on a physical printout with our staff when you pick up the unit.
      </p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${data.signUrl}" style="background:#004C25;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Review &amp; Sign Electronically
        </a>
      </p>

      <p style="font-size:12px;color:#68766E;margin-top:32px;">
        Questions? Reach us${data.orgContactPhone ? ` at ${escapeHtml(data.orgContactPhone)}` : ""}${
          data.orgContactEmail ? ` or ${escapeHtml(data.orgContactEmail)}` : ""
        }.<br/>
        — ${escapeHtml(data.orgName)}
      </p>
    </div>
  </div>`;
}

/**
 * Sends (or re-sends) the payment-confirmation email — T&Cs + e-invoice +
 * e-sign link — for a booking, via the organization's own GHL location.
 * Generates/persists a signatureToken on first send. Never throws; the
 * outcome is persisted on the booking (confirmationEmailSentAt/Error) and
 * returned so callers can show it immediately.
 */
export async function sendBookingConfirmationEmail(
  bookingId: string,
  baseUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { organization: true, vehicle: true, customer: true },
  });
  if (!booking) return { ok: false, error: "Booking not found" };

  const { organization: org, vehicle, customer } = booking;

  if (!customer.email) {
    const error = "Customer has no email address on file";
    await prisma.booking.update({ where: { id: booking.id }, data: { confirmationEmailError: error } });
    return { ok: false, error };
  }
  if (!isGhlConfigured(org)) {
    const error = "GoHighLevel isn't connected — add a Location ID and API key in Settings → Storefront";
    await prisma.booking.update({ where: { id: booking.id }, data: { confirmationEmailError: error } });
    return { ok: false, error };
  }

  const signatureToken = booking.signatureToken ?? generateSignatureToken();
  if (!booking.signatureToken) {
    await prisma.booking.update({ where: { id: booking.id }, data: { signatureToken } });
  }

  const ghlConfig = { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! };
  const contactId = await upsertGhlContact(ghlConfig, {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    source: "Fleet Manager booking confirmation",
  });
  if (!contactId) {
    const error = "Could not sync/find the customer as a GHL contact";
    await prisma.booking.update({ where: { id: booking.id }, data: { confirmationEmailError: error } });
    return { ok: false, error };
  }

  const html = buildConfirmationEmailHtml({
    orgName: org.name,
    orgLogoUrl: org.logoUrl,
    orgContactPhone: org.contactPhone,
    orgContactEmail: org.contactEmail,
    termsAndConditionsText: org.termsAndConditionsText,
    vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    customerName: customer.name,
    startDate: booking.startDate,
    endDate: booking.endDate,
    pickupMethod: booking.pickupMethod,
    pickupLocation: booking.pickupLocation,
    dropoffMethod: booking.dropoffMethod,
    dropoffLocation: booking.dropoffLocation,
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    driverFee: booking.driverFee,
    deliveryFee: booking.deliveryFee,
    dropoffFee: booking.dropoffFee,
    carwashFee: booking.carwashFee,
    excessTimeFee: booking.excessTimeFee,
    kind: booking.status === "HOLD" ? "hold" : "reservation",
    signUrl: `${baseUrl}/sign/${signatureToken}`,
  });

  const result = await sendGhlEmail(ghlConfig, {
    contactId,
    subject: `Your booking with ${org.name} — payment confirmed`,
    html,
  });

  if (result.ok) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { confirmationEmailSentAt: new Date(), confirmationEmailError: null },
    });
    return { ok: true };
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { confirmationEmailError: result.error },
  });
  return result;
}
