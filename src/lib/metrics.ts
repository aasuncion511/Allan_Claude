import { prisma } from "@/lib/db";

export type MonthKey = string; // "YYYY-MM"

export type MonthlyRow = {
  key: MonthKey;
  year: number;
  month: number; // 1-12
  revenue: number;
  expense: number;
  profit: number;
};

function monthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addToMap(map: Map<MonthKey, number>, date: Date, amount: number) {
  const key = monthKey(date);
  map.set(key, (map.get(key) ?? 0) + amount);
}

function mergeToRows(
  revenueMap: Map<MonthKey, number>,
  expenseMap: Map<MonthKey, number>
): MonthlyRow[] {
  const keys = new Set([...revenueMap.keys(), ...expenseMap.keys()]);
  const rows = [...keys].map((key) => {
    const [year, month] = key.split("-").map(Number);
    const revenue = revenueMap.get(key) ?? 0;
    const expense = expenseMap.get(key) ?? 0;
    return { key, year, month, revenue, expense, profit: revenue - expense };
  });
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows;
}

/** Per-unit monthly revenue/expense/profit series across all recorded history. */
export async function getVehicleMonthlySummary(
  vehicleId: string
): Promise<MonthlyRow[]> {
  const [bookings, expenses, maintenance, fuel] = await Promise.all([
    prisma.booking.findMany({
      where: { vehicleId, status: { not: "CANCELLED" } },
      select: { startDate: true, totalAmount: true },
    }),
    prisma.expense.findMany({
      where: { vehicleId },
      select: { date: true, amount: true },
    }),
    prisma.maintenanceLog.findMany({
      where: { vehicleId },
      select: { date: true, cost: true },
    }),
    prisma.fuelLog.findMany({
      where: { vehicleId },
      select: { date: true, cost: true },
    }),
  ]);

  const revenueMap = new Map<MonthKey, number>();
  const expenseMap = new Map<MonthKey, number>();

  for (const b of bookings) addToMap(revenueMap, b.startDate, b.totalAmount);
  for (const e of expenses) addToMap(expenseMap, e.date, e.amount);
  for (const m of maintenance) addToMap(expenseMap, m.date, m.cost);
  for (const f of fuel) addToMap(expenseMap, f.date, f.cost);

  return mergeToRows(revenueMap, expenseMap);
}

export type VehicleFleetSummary = {
  vehicleId: string;
  label: string;
  plateNumber: string;
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  monthly: MonthlyRow[];
};

/** Fleet-wide monthly series (all units combined) plus a per-unit breakdown. */
export async function getFleetSummary(): Promise<{
  overall: MonthlyRow[];
  perVehicle: VehicleFleetSummary[];
}> {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { plateNumber: "asc" },
  });

  const overallRevenue = new Map<MonthKey, number>();
  const overallExpense = new Map<MonthKey, number>();
  const perVehicle: VehicleFleetSummary[] = [];

  for (const vehicle of vehicles) {
    const monthly = await getVehicleMonthlySummary(vehicle.id);
    let totalRevenue = 0;
    let totalExpense = 0;
    for (const row of monthly) {
      totalRevenue += row.revenue;
      totalExpense += row.expense;
      overallRevenue.set(
        row.key,
        (overallRevenue.get(row.key) ?? 0) + row.revenue
      );
      overallExpense.set(
        row.key,
        (overallExpense.get(row.key) ?? 0) + row.expense
      );
    }
    perVehicle.push({
      vehicleId: vehicle.id,
      label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      totalRevenue,
      totalExpense,
      totalProfit: totalRevenue - totalExpense,
      monthly,
    });
  }

  return {
    overall: mergeToRows(overallRevenue, overallExpense),
    perVehicle,
  };
}

export function filterByYear(rows: MonthlyRow[], year: number): MonthlyRow[] {
  return rows.filter((r) => r.year === year);
}

export function sumRows(rows: MonthlyRow[]) {
  return rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      expense: acc.expense + r.expense,
      profit: acc.profit + r.profit,
    }),
    { revenue: 0, expense: 0, profit: 0 }
  );
}

export function distinctYears(rows: MonthlyRow[]): number[] {
  const years = new Set(rows.map((r) => r.year));
  if (years.size === 0) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}

export type FuelConsumptionPoint = {
  date: Date;
  kmDriven: number;
  liters: number;
  litersPer100km: number;
};

/** L/100km between consecutive full-tank fill-ups, ordered by odometer reading. */
export function computeFuelConsumption(
  fuelLogs: { date: Date; odometer: number | null; liters: number; fullTank: boolean }[]
): FuelConsumptionPoint[] {
  const withOdometer = fuelLogs
    .filter((f) => f.odometer !== null && f.fullTank)
    .sort((a, b) => (a.odometer as number) - (b.odometer as number));

  const points: FuelConsumptionPoint[] = [];
  for (let i = 1; i < withOdometer.length; i++) {
    const prev = withOdometer[i - 1];
    const curr = withOdometer[i];
    const kmDriven = (curr.odometer as number) - (prev.odometer as number);
    if (kmDriven <= 0) continue;
    points.push({
      date: curr.date,
      kmDriven,
      liters: curr.liters,
      litersPer100km: (curr.liters / kmDriven) * 100,
    });
  }
  return points;
}
