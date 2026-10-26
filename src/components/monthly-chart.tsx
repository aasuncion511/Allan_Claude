"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/format";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MonthlyChart({
  data,
}: {
  data: { month: number; revenue: number; expense: number; profit: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_LABELS[d.month - 1],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e6df" />
        <XAxis dataKey="label" stroke="#68766e" fontSize={12} />
        <YAxis
          stroke="#68766e"
          fontSize={12}
          tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e1e6df",
            borderRadius: 8,
            fontSize: 13,
          }}
          labelStyle={{ color: "#172e25" }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#004c25" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#a33732" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="Net Profit" fill="#18b957" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
