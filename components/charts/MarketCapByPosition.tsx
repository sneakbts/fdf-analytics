"use client";

import { ResponsivePie } from "@nivo/pie";

interface PositionMarketCap {
  position: string;
  marketCap: number;
  playerCount: number;
}

interface MarketCapByPositionProps {
  data: PositionMarketCap[];
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

function formatMarketCap(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function MarketCapByPosition({ data }: MarketCapByPositionProps) {
  const totalMarketCap = data.reduce((sum, d) => sum + d.marketCap, 0);

  const pieData = data.map((d) => ({
    id: d.position,
    label: d.position,
    value: d.marketCap,
    color: POSITION_COLORS[d.position],
    playerCount: d.playerCount,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div className="bg-gray-900 rounded-lg p-4" style={{ height: 350 }}>
        <ResponsivePie
          data={pieData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          innerRadius={0.5}
          padAngle={2}
          cornerRadius={4}
          activeOuterRadiusOffset={8}
          colors={{ datum: "data.color" }}
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#9CA3AF"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor="#ffffff"
          arcLabel={(d) => `${((d.value / totalMarketCap) * 100).toFixed(0)}%`}
          tooltip={({ datum }) => (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
              <p className="text-white font-medium">{datum.label}</p>
              <p className="text-gray-400 text-sm">
                Market Cap: <span className="text-white">{formatMarketCap(datum.value)}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Players: <span className="text-white">{(datum.data as any).playerCount}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Share: <span className="text-white">{((datum.value / totalMarketCap) * 100).toFixed(1)}%</span>
              </p>
            </div>
          )}
          theme={{
            tooltip: {
              container: {
                background: "transparent",
                padding: 0,
                borderRadius: 0,
                boxShadow: "none",
              },
            },
          }}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {data.map((d) => (
          <div
            key={d.position}
            className="bg-gray-900 rounded-lg p-4 border-l-4"
            style={{ borderLeftColor: POSITION_COLORS[d.position] }}
          >
            <p className="text-gray-400 text-sm mb-1">{d.position}</p>
            <p className="text-2xl font-bold text-white">{formatMarketCap(d.marketCap)}</p>
            <p className="text-gray-500 text-sm mt-1">
              {d.playerCount} players • {((d.marketCap / totalMarketCap) * 100).toFixed(1)}%
            </p>
          </div>
        ))}
        <div className="col-span-2 bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total Market Cap</p>
          <p className="text-3xl font-bold text-white">{formatMarketCap(totalMarketCap)}</p>
        </div>
      </div>
    </div>
  );
}
