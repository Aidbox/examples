"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SyncStats } from "@/lib/server/sync";

const COLORS = [
  "#FF5722", // Deep Orange
  "#E91E63", // Pink
  "#795548", // Brown
  "#FFEB3B", // Bright Yellow
  "#2196F3", // Bright Blue
  "#4CAF50", // Green
  "#CDDC39", // Lime
  "#FFBB28", // Yellow
  "#8BC34A", // Light Green
  "#673AB7", // Deep Purple
  "#607D8B", // Blue Grey
  "#03A9F4", // Light Blue
  "#F44336", // Red
  "#FF8042", // Orange
  "#0088FE", // Blue
  "#00C49F", // Teal
  "#9C27B0", // Purple
  "#FFC107", // Amber
];

export function SyncDataChart({
  resources,
}: {
  resources: SyncStats["resources"];
}) {
  const data = Object.entries(resources).map(([resourceType, count]) => ({
    resourceType,
    count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie dataKey="count" nameKey={"resourceType"} data={data}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
