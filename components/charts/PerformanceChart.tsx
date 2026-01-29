"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PerformanceDataPoint {
  date: string;
  raw_score: number | null;
  ranking: number | null;
  reward: number | null;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  metric: "raw_score" | "ranking" | "reward";
  height?: number;
}

const METRIC_CONFIG = {
  raw_score: { label: "Raw Score", color: "#3B82F6" },
  ranking: { label: "Ranking", color: "#10B981" },
  reward: { label: "Reward", color: "#F59E0B" },
};

export function PerformanceChart({
  data,
  metric,
  height = 250,
}: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        No performance data available
      </div>
    );
  }

  const config = METRIC_CONFIG[metric];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis stroke="#9CA3AF" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#9CA3AF" }}
          formatter={(value: number) => [
            metric === "reward" ? `${value.toLocaleString()} TP` : value,
            config.label,
          ]}
          labelFormatter={(label) =>
            new Date(label).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          }
        />
        <Bar dataKey={metric} fill={config.color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
