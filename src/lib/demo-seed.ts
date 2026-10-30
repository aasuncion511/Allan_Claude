import { prisma } from "@/lib/db";

/**
 * Lightweight sample data for a self-provisioned /demo sandbox — enough for
 * a prospect to see a working business immediately (a few cars, customers,
 * and bookings already in motion) without the cost of prisma/seed.ts's full
 * 8-month history generator, which is far too slow to run inline during an
 * interactive signup request. Purely additive: only ever creates rows tied
 * to the one new demo organizationId, never touches any other org's data.
 */
const VEHICLES = [
  { plateNumber: "DEM 1001", make: "Toyota", model: "Vios", year: 2023, color: "White", dailyRate: 2000, category: "Sedan", reservationCategory: "SEDAN", seats: 5, transmission: "Automatic", featured: true, description: "A fuel-efficient sedan, perfect for city drives and out-of-town trips alike." },
  { plateNumber: "DEM 1002", make: "Toyota", model: "Innova", year: 2022, color: "Silver", dailyRate: 3200, category: "Van", reservationCategory: null, seats: 8, transmission: "Automatic", featured: true, description: "Spacious 8-seater, ideal for family outings and group travel." },
  { plateNumber: "DEM 1003", make: "Mitsubishi", model: "Xpander", year: 2023, color: "Red", dailyRate: 2800, category: "MPV", reservationCategory: null, seats: 7, transmission: "Automatic", featured: false, description: "A stylish, comfortable MPV with room for the whole family." },
  { plateNumber: "DEM 1004", make: "Honda", model: "City", year: 2021, color: "Black", dailyRate: 2200, category: "Sedan", reservationCategory: "SEDAN", seats: 5, transmission: "Automatic", featured: false, description: "Reliable and economical — a great everyday sedan." },
] as const;

const CUSTOMERS = [
  { name: "Maria Santos", phone: "+63 917 100 2001", email: "maria.santos@example.com", driverLicense: "N01-23-456789" },
  { name: "Juan Dela Cruz", phone: "+63 917 100 2002", email: "juan.delacruz@example.com", driverLicense: "N02-23-456790" },
  { name: "Angelica Reyes", phone: "+63 917 100 2003", email: "angelica.reyes@example.com", driverLicense: "N03-23-456791" },
] as const;

const FAQS = [
  { question: "What documents do I need to rent a car?", answer: "Two valid IDs (including your driver's license) and proof of billing." },
  { question: "Is the reservation fee refundable?", answer: "No, the reservation fee is non-refundable once a unit is confirmed for your dates." },
];

const TESTIMONIALS = [
  { authorName: "Arjay S.", quote: "Fast and smooth transaction! Very clear on the charges. Highly recommended!" },
];

export async function seedDemoOrgData(organizationId: string): Promise<void> {
  for (const [i, f] of FAQS.entries()) {
    await prisma.faq.create({ data: { ...f, order: i, organizationId } });
  }
  for (const [i, t] of TESTIMONIALS.entries()) {
    await prisma.testimonial.create({ data: { ...t, order: i, organizationId } });
  }

  const vehicles = [];
  for (const v of VEHICLES) {
    vehicles.push(
      await prisma.vehicle.create({
        data: { ...v, organizationId, odometer: 10000, status: "AVAILABLE" },
      })
    );
  }

  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { ...c, organizationId } }));
  }

  const today = new Date();
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 86_400_000);

  // One rental in progress right now, one upcoming reservation, one completed
  // in the past — enough to populate the dashboard, calendar, and booking
  // list with a realistic mix on first login.
  const [active, reserved, completed] = [
    { vehicle: vehicles[0], customer: customers[0], start: daysFromNow(-1), end: daysFromNow(2), status: "ACTIVE" as const, paidFraction: 0.5 },
    { vehicle: vehicles[1], customer: customers[1], start: daysFromNow(5), end: daysFromNow(8), status: "RESERVED" as const, paidFraction: 0 },
    { vehicle: vehicles[2], customer: customers[2], start: daysFromNow(-10), end: daysFromNow(-7), status: "COMPLETED" as const, paidFraction: 1 },
  ];

  for (const b of [active, reserved, completed]) {
    const days = Math.max(1, Math.round((b.end.getTime() - b.start.getTime()) / 86_400_000));
    const totalAmount = b.vehicle.dailyRate * days;
    const amountPaid = totalAmount * b.paidFraction;
    await prisma.booking.create({
      data: {
        organizationId,
        vehicleId: b.vehicle.id,
        customerId: b.customer.id,
        startDate: b.start,
        endDate: b.end,
        status: b.status,
        dailyRate: b.vehicle.dailyRate,
        totalAmount,
        securityDeposit: 2000,
        securityDepositStatus: b.status === "COMPLETED" ? "REFUNDED" : b.status === "ACTIVE" ? "HELD" : "NOT_COLLECTED",
        amountPaid,
        paymentStatus: amountPaid >= totalAmount ? "PAID" : amountPaid > 0 ? "PENDING" : "UNPAID",
        paymentConfirmedAt: amountPaid > 0 ? b.start : null,
        pickupLocation: "Main Branch",
        dropoffLocation: "Main Branch",
      },
    });
  }

  await prisma.vehicle.update({ where: { id: active.vehicle.id }, data: { status: "BOOKED" } });
  await prisma.vehicle.update({ where: { id: reserved.vehicle.id }, data: { status: "RESERVED" } });
}
