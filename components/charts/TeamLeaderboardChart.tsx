"use client";

import { ResponsiveBar } from "@nivo/bar";

interface TeamData {
  team: string;
  totalTP: number;
  totalMarketCap: number;
  totalCirculatingShares: number;
  playerCount: number;
  tpPerDollar: number;
}

interface TeamLeaderboardChartProps {
  data: TeamData[];
  metric: "totalTP" | "tpPerDollar";
}

function formatValue(value: number, metric: "totalTP" | "tpPerDollar"): string {
  if (metric === "tpPerDollar") {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function TeamLeaderboardChart({ data, metric }: TeamLeaderboardChartProps) {
  const chartData = data.map((d) => ({
    team: d.team.length > 15 ? d.team.substring(0, 15) + "..." : d.team,
    fullTeam: d.team,
    value: d[metric],
    totalTP: d.totalTP,
    totalMarketCap: d.totalMarketCap,
    playerCount: d.playerCount,
    tpPerDollar: d.tpPerDollar,
  })).reverse(); // Reverse for horizontal bar (top at top)

  const color = metric === "totalTP" ? "#22C55E" : "#3B82F6";

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height: 450 }}>
      <ResponsiveBar
        data={chartData}
        keys={["value"]}
        indexBy="team"
        layout="horizontal"
        margin={{ top: 10, right: 30, bottom: 30, left: 120 }}
        padding={0.3}
        valueScale={{ type: "linear" }}
        colors={[color]}
        borderRadius={4}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (v) => formatValue(Number(v), metric),
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
        }}
        labelSkipWidth={40}
        labelSkipHeight={12}
        label={(d) => formatValue(d.value as number, metric)}
        labelTextColor="#ffffff"
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: {
            ticks: { text: { fill: "#9CA3AF" } },
          },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
        }}
        tooltip={({ data }) => (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
            <p className="text-white font-medium">{(data as any).fullTeam}</p>
            <p className="text-gray-400 text-sm">
              Total TP: <span className="text-green-400">{formatValue((data as any).totalTP, "totalTP")}</span>
            </p>
            <p className="text-gray-400 text-sm">
              Market Cap: <span className="text-white">${((data as any).totalMarketCap / 1000000).toFixed(2)}M</span>
            </p>
            <p className="text-gray-400 text-sm">
              Efficiency: <span className="text-blue-400">{formatValue((data as any).tpPerDollar, "tpPerDollar")}</span>
            </p>
            <p className="text-gray-400 text-sm">
              Players: <span className="text-white">{(data as any).playerCount}</span>
            </p>
          </div>
        )}
      />
    </div>
  );
}
