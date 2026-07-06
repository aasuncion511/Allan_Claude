import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, ""),
});
const prisma = new PrismaClient({ adapter });

const VEHICLES = [
  { plateNumber: "NBW 1234", make: "Toyota", model: "Vios", year: 2023, color: "White", dailyRate: 2000, odometerStart: 8000 },
  { plateNumber: "NBW 5678", make: "Toyota", model: "Innova", year: 2022, color: "Silver", dailyRate: 3200, odometerStart: 21000 },
  { plateNumber: "NCP 2211", make: "Mitsubishi", model: "Xpander", year: 2023, color: "Red", dailyRate: 2800, odometerStart: 12500 },
  { plateNumber: "NDR 4590", make: "Honda", model: "City", year: 2021, color: "Black", dailyRate: 2200, odometerStart: 35000 },
  { plateNumber: "NEF 7788", make: "Toyota", model: "Hiace", year: 2020, color: "White", dailyRate: 5500, odometerStart: 62000 },
  { plateNumber: "NGH 3345", make: "Nissan", model: "Almera", year: 2022, color: "Gray", dailyRate: 1900, odometerStart: 18000 },
];

const CUSTOMERS = [
  { name: "Maria Santos", phone: "+63 917 100 2001", email: "maria.santos@example.com", driverLicense: "N01-23-456789" },
  { name: "Juan Dela Cruz", phone: "+63 917 100 2002", email: "juan.delacruz@example.com", driverLicense: "N02-23-456790" },
  { name: "Angelica Reyes", phone: "+63 917 100 2003", email: "angelica.reyes@example.com", driverLicense: "N03-23-456791" },
  { name: "Mark Villanueva", phone: "+63 917 100 2004", email: "mark.villanueva@example.com", driverLicense: "N04-23-456792" },
  { name: "Kristine Bautista", phone: "+63 917 100 2005", email: "kristine.bautista@example.com", driverLicense: "N05-23-456793" },
  { name: "Paolo Mendoza", phone: "+63 917 100 2006", email: "paolo.mendoza@example.com", driverLicense: "N06-23-456794" },
  { name: "Andrea Cruz", phone: "+63 917 100 2007", email: "andrea.cruz@example.com", driverLicense: "N07-23-456795" },
  { name: "Ramon Torres", phone: "+63 917 100 2008", email: "ramon.torres@example.com", driverLicense: "N08-23-456796" },
];

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

// Simple deterministic pseudo-random so seed output is stable across runs.
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

async function main() {
  console.log("Seeding database...");

  // Deleting the organization cascades to every other table.
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: {
      name: "Reyna Car Rentals",
      subscriptionStatus: "ACTIVE",
    },
  });
  console.log(`Created organization: ${organization.name}`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Fleet Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "OWNER",
    },
  });
  console.log(`Created admin user: ${adminEmail}`);

  const vehicles = [];
  for (const v of VEHICLES) {
    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: organization.id,
        plateNumber: v.plateNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        dailyRate: v.dailyRate,
        odometer: v.odometerStart,
        status: "AVAILABLE",
      },
    });
    vehicles.push({ ...vehicle, odometerStart: v.odometerStart });
  }
  console.log(`Created ${vehicles.length} vehicles.`);

  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(
      await prisma.customer.create({ data: { ...c, organizationId: organization.id } })
    );
  }
  console.log(`Created ${customers.length} customers.`);

  const today = new Date();
  const monthsBack = 8; // generate history for the trailing 8 months
  const startWindow = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);

  const odometerTracker = new Map(vehicles.map((v) => [v.id, v.odometerStart]));

  for (const vehicle of vehicles) {
    // --- Bookings: 2-5 per month across the window ---
    for (let m = 0; m <= monthsBack; m++) {
      const monthDate = new Date(startWindow.getFullYear(), startWindow.getMonth() + m, 1);
      if (monthDate > today) break;
      const bookingsThisMonth = randInt(2, 5);
      for (let i = 0; i < bookingsThisMonth; i++) {
        const day = randInt(1, 26);
        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        if (start > today) continue;
        const duration = randInt(1, 5);
        const end = new Date(start.getTime() + duration * 86_400_000);
        const days = daysBetween(start, end);
        const isPast = end < today;
        await prisma.booking.create({
          data: {
            vehicleId: vehicle.id,
            organizationId: organization.id,
            customerId: pick(customers).id,
            startDate: start,
            endDate: end,
            status: isPast ? "COMPLETED" : "ACTIVE",
            dailyRate: vehicle.dailyRate,
            totalAmount: vehicle.dailyRate * days,
            securityDeposit: 5000,
            depositReturned: isPast,
            amountPaid: isPast ? vehicle.dailyRate * days : vehicle.dailyRate * days * 0.5,
            pickupLocation: "Main Branch",
            dropoffLocation: "Main Branch",
          },
        });
      }
    }

    // A couple of upcoming reservations
    for (let i = 0; i < 2; i++) {
      const start = new Date(today.getTime() + randInt(2, 20) * 86_400_000);
      const duration = randInt(2, 6);
      const end = new Date(start.getTime() + duration * 86_400_000);
      await prisma.booking.create({
        data: {
          vehicleId: vehicle.id,
          organizationId: organization.id,
          customerId: pick(customers).id,
          startDate: start,
          endDate: end,
          status: "RESERVED",
          dailyRate: vehicle.dailyRate,
          totalAmount: vehicle.dailyRate * duration,
          securityDeposit: 5000,
          amountPaid: 0,
          pickupLocation: "Main Branch",
          dropoffLocation: "Main Branch",
        },
      });
    }

    // Reflect the most relevant booking in the unit's current status
    const activeNow = await prisma.booking.findFirst({
      where: { vehicleId: vehicle.id, status: "ACTIVE", startDate: { lte: today }, endDate: { gte: today } },
    });
    const reservedSoon = await prisma.booking.findFirst({
      where: { vehicleId: vehicle.id, status: "RESERVED", startDate: { lte: new Date(today.getTime() + 3 * 86_400_000) } },
    });
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status: activeNow ? "BOOKED" : reservedSoon ? "RESERVED" : "AVAILABLE" },
    });

    // --- Other expenses: insurance, registration, cleaning ---
    for (let m = 0; m <= monthsBack; m += 3) {
      const monthDate = new Date(startWindow.getFullYear(), startWindow.getMonth() + m, 10);
      if (monthDate > today) break;
      await prisma.expense.create({
        data: {
          vehicleId: vehicle.id,
          organizationId: organization.id,
          category: "CLEANING",
          amount: randInt(300, 800),
          date: monthDate,
          vendor: "Sparkle Auto Wash",
          description: "Interior and exterior detailing",
        },
      });
    }
    await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        organizationId: organization.id,
        category: "INSURANCE",
        amount: randInt(8000, 15000),
        date: new Date(startWindow.getFullYear(), startWindow.getMonth() + 1, 5),
        vendor: "Malayan Insurance",
        description: "Comprehensive insurance renewal",
      },
    });
    await prisma.expense.create({
      data: {
        vehicleId: vehicle.id,
        organizationId: organization.id,
        category: "REGISTRATION",
        amount: randInt(2000, 4000),
        date: new Date(startWindow.getFullYear(), startWindow.getMonth() + 2, 15),
        vendor: "LTO",
        description: "Annual registration renewal",
      },
    });

    // --- Maintenance: every ~2 months, plus one upcoming due ---
    let odo = odometerTracker.get(vehicle.id)!;
    for (let m = 1; m <= monthsBack; m += 2) {
      const date = new Date(startWindow.getFullYear(), startWindow.getMonth() + m, randInt(1, 25));
      if (date > today) break;
      odo += randInt(1200, 2500);
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: vehicle.id,
          organizationId: organization.id,
          type: pick(["Oil Change", "Tire Rotation", "Brake Inspection", "General Checkup"]),
          date,
          cost: randInt(1500, 4500),
          odometer: odo,
          vendor: "AutoCare Center",
          nextDueDate: new Date(date.getTime() + 90 * 86_400_000),
          nextDueOdometer: odo + 5000,
        },
      });
    }
    odometerTracker.set(vehicle.id, odo);

    // --- Fuel logs: roughly every 10-14 days, odometer increasing ---
    let fuelOdo = odometerTracker.get(vehicle.id)!;
    let cursor = new Date(startWindow);
    while (cursor <= today) {
      fuelOdo += randInt(250, 600);
      const liters = randInt(25, 40);
      await prisma.fuelLog.create({
        data: {
          vehicleId: vehicle.id,
          organizationId: organization.id,
          date: new Date(cursor),
          liters,
          cost: liters * 65,
          odometer: fuelOdo,
          fullTank: true,
        },
      });
      cursor = new Date(cursor.getTime() + randInt(10, 14) * 86_400_000);
    }
    odometerTracker.set(vehicle.id, fuelOdo);

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { odometer: Math.max(odo, fuelOdo) },
    });
  }

  // Force one unit into MAINTENANCE for a realistic status mix on the dashboard.
  const hiace = vehicles.find((v) => v.model === "Hiace");
  if (hiace) {
    await prisma.vehicle.update({ where: { id: hiace.id }, data: { status: "MAINTENANCE" } });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
