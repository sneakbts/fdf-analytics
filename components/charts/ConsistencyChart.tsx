"use client";

import { ResponsiveScatterPlot } from "@nivo/scatterplot";

interface PlayerConsistency {
  id: string;
  name: string;
  position: string;
  avgScore: number;
  stdDev: number;
  gamesPlayed: number;
}

interface ConsistencyChartProps {
  data: PlayerConsistency[];
  height?: number;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

export function ConsistencyChart({ data, height = 500 }: ConsistencyChartProps) {
  // Group data by position
  const chartData = Object.entries(POSITION_COLORS).map(([position, color]) => ({
    id: position,
    data: data
      .filter((d) => d.position === position && d.avgScore > 0)
      .map((d) => ({
        x: d.avgScore,
        y: d.stdDev,
        name: d.name,
        gamesPlayed: d.gamesPlayed,
      })),
  }));

  const allPoints = data.filter((d) => d.avgScore > 0);
  if (allPoints.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg" style={{ height }}>
        No consistency data available
      </div>
    );
  }

  const maxX = Math.max(...allPoints.map((p) => p.avgScore));
  const maxY = Math.max(...allPoints.map((p) => p.stdDev));

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height }}>
      <ResponsiveScatterPlot
        data={chartData}
        margin={{ top: 20, right: 140, bottom: 70, left: 90 }}
        xScale={{ type: "linear", min: 0, max: maxX * 1.1 }}
        yScale={{ type: "linear", min: 0, max: maxY * 1.1 }}
        colors={Object.values(POSITION_COLORS)}
        nodeSize={10}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Average Raw Score",
          legendPosition: "middle",
          legendOffset: 50,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Score Std Deviation (Volatility)",
          legendPosition: "middle",
          legendOffset: -70,
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: {
            ticks: { text: { fill: "#9CA3AF" } },
            legend: { text: { fill: "#9CA3AF" } },
          },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
        }}
        tooltip={({ node }) => (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-white font-medium">{(node.data as any).name}</p>
            <p className="text-gray-400 text-sm">
              Avg Score: <span className="text-white">{node.data.x.toFixed(1)}</span>
            </p>
            <p className="text-gray-400 text-sm">
              Std Dev: <span className="text-white">{node.data.y.toFixed(1)}</span>
            </p>
            <p className="text-gray-400 text-sm">
              Games: <span className="text-white">{(node.data as any).gamesPlayed}</span>
            </p>
          </div>
        )}
        useMesh={true}
        legends={[
          {
            anchor: "right",
            direction: "column",
            justify: false,
            translateX: 130,
            translateY: 0,
            itemsSpacing: 5,
            itemDirection: "left-to-right",
            itemWidth: 120,
            itemHeight: 20,
            itemOpacity: 0.85,
            symbolSize: 12,
            symbolShape: "circle",
            itemTextColor: "#9CA3AF",
          },
        ]}
      />
      <p className="text-center text-gray-500 text-sm mt-2">
        Bottom-right = High performance, consistent. Top-left = Lower performance, volatile.
      </p>
    </div>
  );
}
