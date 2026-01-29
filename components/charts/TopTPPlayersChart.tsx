"use client";

import { ResponsiveBar } from "@nivo/bar";

interface TopTPPlayer {
  name: string;
  position: string;
  tpFinishes: number;
}

interface TopTPPlayersChartProps {
  data: TopTPPlayer[];
  height?: number;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

export function TopTPPlayersChart({ data, height = 500 }: TopTPPlayersChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg" style={{ height }}>
        No data available
      </div>
    );
  }

  // Transform for Nivo - reverse so highest is at top
  const chartData = [...data].reverse().map((player) => ({
    name: player.name,
    tpFinishes: player.tpFinishes,
    position: player.position,
    color: POSITION_COLORS[player.position] || "#6B7280",
  }));

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height }}>
      <ResponsiveBar
        data={chartData}
        keys={["tpFinishes"]}
        indexBy="name"
        layout="horizontal"
        margin={{ top: 10, right: 30, bottom: 50, left: 140 }}
        padding={0.3}
        colors={({ data }) => data.color as string}
        borderRadius={4}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          legend: "TP Finishes",
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
        }}
        enableGridX={true}
        enableGridY={false}
        labelSkipWidth={20}
        labelTextColor="#fff"
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: {
            ticks: { text: { fill: "#9CA3AF" } },
            legend: { text: { fill: "#9CA3AF" } },
          },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
        }}
        tooltip={({ data, value }) => (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
            <p className="text-white font-medium text-sm">{data.name}</p>
            <p className="text-gray-400 text-sm">
              {data.position}: <span className="text-white">{value} TP finishes</span>
            </p>
          </div>
        )}
      />
    </div>
  );
}
