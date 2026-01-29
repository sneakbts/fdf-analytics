"use client";

import { ResponsiveLine } from "@nivo/line";

interface MonthlyTP {
  month: string; // "2024-01" format
  totalTP: number;
  byPosition: Record<string, number>;
}

interface MonthlyTPTrendsProps {
  data: MonthlyTP[];
  height?: number;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

function formatTP(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function MonthlyTPTrends({ data, height = 400 }: MonthlyTPTrendsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg" style={{ height }}>
        No monthly data available
      </div>
    );
  }

  // Transform data for Nivo line chart - one line per position
  const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"];
  const chartData = positions.map((position) => ({
    id: position,
    color: POSITION_COLORS[position],
    data: data.map((d) => ({
      x: formatMonth(d.month),
      y: d.byPosition[position] || 0,
    })),
  }));

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 130, bottom: 60, left: 80 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 0, stacked: false }}
        curve="monotoneX"
        colors={Object.values(POSITION_COLORS)}
        lineWidth={2}
        pointSize={8}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        enableArea={false}
        enableGridX={false}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: "Month",
          legendOffset: 50,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Total TP",
          legendOffset: -65,
          legendPosition: "middle",
          format: (v) => formatTP(Number(v)),
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: {
            ticks: { text: { fill: "#9CA3AF" } },
            legend: { text: { fill: "#9CA3AF" } },
          },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
          crosshair: {
            line: {
              stroke: "#9CA3AF",
              strokeWidth: 1,
              strokeOpacity: 0.5,
            },
          },
        }}
        tooltip={({ point }) => (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-white font-medium">{point.seriesId}</p>
            <p className="text-gray-400 text-sm">
              {point.data.xFormatted}: <span className="text-white">{formatTP(point.data.y as number)} TP</span>
            </p>
          </div>
        )}
        legends={[
          {
            anchor: "right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 5,
            itemDirection: "left-to-right",
            itemWidth: 100,
            itemHeight: 20,
            itemOpacity: 0.85,
            symbolSize: 12,
            symbolShape: "circle",
            itemTextColor: "#9CA3AF",
          },
        ]}
        useMesh={true}
      />
    </div>
  );
}
