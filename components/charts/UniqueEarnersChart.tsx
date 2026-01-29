"use client";

import { ResponsiveLine } from "@nivo/line";

interface MonthlyUniqueEarners {
  month: string; // "2024-01" format
  byPosition: Record<string, number>;
}

interface UniqueEarnersChartProps {
  data: MonthlyUniqueEarners[];
  height?: number;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function UniqueEarnersChart({ data, height = 400 }: UniqueEarnersChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg" style={{ height }}>
        No data available
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
        margin={{ top: 20, right: 130, bottom: 60, left: 60 }}
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
          legend: "Unique Earners",
          legendOffset: -45,
          legendPosition: "middle",
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
            <p className="text-white font-medium">{point.serieId}</p>
            <p className="text-gray-400 text-sm">
              {point.data.xFormatted}: <span className="text-white">{point.data.y} players</span>
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
