"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveLine } from "@nivo/line";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
}

interface PerformanceRecord {
  match_date: string;
  raw_score: number | null;
  ranking: number | null;
  reward: number | null;
}

interface PlayerHistoricalData {
  id: string;
  name: string;
  team: string;
  position: string;
  performances: PerformanceRecord[];
  cumulativeTP: { date: string; total: number }[];
  priceHistory: { date: string; price: number }[];
  stats: {
    totalGames: number;
    totalTP: number;
    avgScore: number;
    avgRanking: number;
    bestRanking: number;
    tpRate: number;
    tpGames: number;
    firstGame: string;
    lastGame: string;
  };
}

interface HistoricalClientProps {
  allPlayers: Player[];
  playerData: PlayerHistoricalData | null;
  selectedPlayerId?: string;
}

function formatTP(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPrice(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function PlayerSelector({
  players,
  selectedId,
  onSelect,
}: {
  players: Player[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredPlayers = useMemo(() => {
    if (!search) return players;
    const lower = search.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.team.toLowerCase().includes(lower)
    );
  }, [players, search]);

  const selectedPlayer = players.find((p) => p.id === selectedId);

  return (
    <div className="relative">
      <div
        className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedPlayer ? (
          <div>
            <p className="text-white font-medium text-lg">{selectedPlayer.name}</p>
            <p className="text-gray-400">
              {selectedPlayer.team} • {selectedPlayer.position}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Click to select a player...</p>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-72">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-700 transition-colors ${
                  player.id === selectedId ? "bg-gray-700" : ""
                }`}
                onClick={() => {
                  onSelect(player.id);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <p className="text-white">{player.name}</p>
                <p className="text-gray-400 text-sm">
                  {player.team} • {player.position}
                </p>
              </div>
            ))}
            {filteredPlayers.length === 0 && (
              <p className="px-4 py-3 text-gray-500">No players found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-gray-500 text-sm mt-1">{subValue}</p>}
    </div>
  );
}

function CumulativeTPChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No TP data available
      </div>
    );
  }

  const chartData = [
    {
      id: "Cumulative TP",
      color: "#22C55E",
      data: data.map((d) => ({
        x: new Date(d.date),
        y: d.total,
      })),
    },
  ];

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
        xScale={{ type: "time", format: "native", useUTC: false }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: "linear", min: 0, max: "auto" }}
        curve="monotoneX"
        colors={["#22C55E"]}
        lineWidth={2}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor="#22C55E"
        pointColor="#1F2937"
        enableGridX={false}
        enableArea={true}
        areaOpacity={0.1}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: "%b %Y",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          format: (v) => formatTP(Number(v)),
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: { ticks: { text: { fill: "#9CA3AF" } } },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
          crosshair: { line: { stroke: "#9CA3AF", strokeWidth: 1 } },
        }}
        useMesh={true}
        tooltip={({ point }) => {
          const data = point.data as { x: Date; y: number };
          return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <p className="text-white font-medium text-sm">
                {data.x.toLocaleDateString()}
              </p>
              <p className="text-green-400 text-sm">{formatTP(data.y)} TP</p>
            </div>
          );
        }}
      />
    </div>
  );
}

function RankingChart({ data, position }: { data: PerformanceRecord[]; position: string }) {
  const rankingData = data.filter((d) => d.ranking !== null);

  if (rankingData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No ranking data available
      </div>
    );
  }

  // For GK: ranks 1,2,3 get their own row, then linear from 5
  // For MID, DEF, FWD: ranks 1,2,3,4,5 each get their own row, then linear from 5
  const isGoalkeeper = position === "Goalkeeper";

  const transformRank = (rank: number): number => {
    if (isGoalkeeper) {
      // GK: 1,2,3 spaced, then linear
      if (rank === 1) return 0;
      if (rank === 2) return 5;
      if (rank === 3) return 10;
      if (rank === 4) return 12.5;
      return rank + 10; // 5→15, 10→20, etc.
    } else {
      // MID, DEF, FWD: 1,2,3,4,5 each spaced, then linear
      if (rank === 1) return 0;
      if (rank === 2) return 5;
      if (rank === 3) return 10;
      if (rank === 4) return 15;
      if (rank === 5) return 20;
      // rank >= 6: linear from position 20
      return 20 + (rank - 5); // 6→21, 10→25, 15→30, 20→35
    }
  };

  const inverseTransform = (val: number): number => {
    if (isGoalkeeper) {
      if (val === 0) return 1;
      if (val === 5) return 2;
      if (val === 10) return 3;
      if (val < 15) return 4;
      return val - 10;
    } else {
      if (val === 0) return 1;
      if (val === 5) return 2;
      if (val === 10) return 3;
      if (val === 15) return 4;
      if (val === 20) return 5;
      return val - 15; // 21→6, 25→10, 30→15
    }
  };

  const chartData = [
    {
      id: "Ranking",
      color: "#3B82F6",
      data: rankingData.map((d) => ({
        x: new Date(d.match_date),
        y: transformRank(d.ranking!),
        originalRank: d.ranking,
      })),
    },
  ];

  // Tick values based on position
  const maxRanking = Math.max(...rankingData.map((d) => d.ranking!));
  const displayTicks = isGoalkeeper ? [1, 2, 3, 5, 10] : [1, 2, 3, 4, 5, 10];
  if (maxRanking > 12) displayTicks.push(15);
  if (maxRanking > 17) displayTicks.push(20);
  if (maxRanking > 22) displayTicks.push(25);
  if (maxRanking > 27) displayTicks.push(30);
  const tickValues = displayTicks.map(transformRank);

  // Custom layer to render colored points for top 3 ranks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customPointsLayer = (props: any) => {
    const { points } = props;
    return (
      <g>
        {points.map((point: any, index: number) => {
          const originalRank = point.data.originalRank;
          const isTopThree = originalRank <= 3;
          const strokeColor = isTopThree ? "#22C55E" : "#3B82F6"; // green for top 3, blue otherwise

          return (
            <circle
              key={point.id || index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#1F2937"
              stroke={strokeColor}
              strokeWidth={2}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: "time", format: "native", useUTC: false }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: "linear", min: 0, max: "auto", reverse: true }}
        curve="monotoneX"
        colors={["#3B82F6"]}
        lineWidth={2}
        enablePoints={false}
        enableGridX={false}
        layers={["grid", "markers", "axes", "areas", "crosshair", "lines", customPointsLayer, "slices", "mesh", "legends"]}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: "%b %Y",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickValues: tickValues,
          format: (v) => Math.round(inverseTransform(Number(v))),
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: { ticks: { text: { fill: "#9CA3AF" } } },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
          crosshair: { line: { stroke: "#9CA3AF", strokeWidth: 1 } },
        }}
        useMesh={true}
        tooltip={({ point }) => {
          const data = point.data as { x: Date; y: number; originalRank?: number };
          const rank = data.originalRank || Math.round(inverseTransform(data.y));
          return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <p className="text-white font-medium text-sm">
                {data.x.toLocaleDateString()}
              </p>
              <p className="text-blue-400 text-sm">Rank #{rank}</p>
            </div>
          );
        }}
      />
    </div>
  );
}

function PriceChart({ data }: { data: { date: string; price: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No price data available
      </div>
    );
  }

  const chartData = [
    {
      id: "Price",
      color: "#F59E0B",
      data: data.map((d) => ({
        x: new Date(d.date),
        y: d.price,
      })),
    },
  ];

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
        xScale={{ type: "time", format: "native", useUTC: false }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: "linear", min: "auto", max: "auto" }}
        curve="monotoneX"
        colors={["#F59E0B"]}
        lineWidth={2}
        pointSize={0}
        enableGridX={false}
        enableArea={true}
        areaOpacity={0.1}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: "%b %Y",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          format: (v) => formatPrice(Number(v)),
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: { ticks: { text: { fill: "#9CA3AF" } } },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
          crosshair: { line: { stroke: "#9CA3AF", strokeWidth: 1 } },
        }}
        useMesh={true}
        tooltip={({ point }) => {
          const data = point.data as { x: Date; y: number };
          return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <p className="text-white font-medium text-sm">
                {data.x.toLocaleDateString()}
              </p>
              <p className="text-yellow-400 text-sm">{formatPrice(data.y)}</p>
            </div>
          );
        }}
      />
    </div>
  );
}

export function HistoricalClient({
  allPlayers,
  playerData,
  selectedPlayerId,
}: HistoricalClientProps) {
  const router = useRouter();

  const handleSelectPlayer = (playerId: string) => {
    router.push(`/historical?player=${playerId}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Historical Data</h1>
          <p className="text-gray-400">View complete performance history for any player</p>
        </div>

        {/* Player Selector */}
        <div className="mb-8 max-w-md">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Player
          </label>
          <PlayerSelector
            players={allPlayers}
            selectedId={selectedPlayerId}
            onSelect={handleSelectPlayer}
          />
        </div>

        {playerData ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                label="Total Games"
                value={playerData.stats.totalGames.toString()}
              />
              <StatCard
                label="Total TP Earned"
                value={formatTP(playerData.stats.totalTP)}
              />
              <StatCard
                label="TP Rate"
                value={`${playerData.stats.tpRate.toFixed(1)}%`}
              />
              <StatCard
                label="Earned TP"
                value={`${playerData.stats.tpGames} Times`}
              />
              <StatCard
                label="Avg Score"
                value={playerData.stats.avgScore.toFixed(1)}
              />
              <StatCard
                label="Best Ranking"
                value={`#${playerData.stats.bestRanking}`}
              />
            </div>

            {/* Cumulative TP Chart */}
            <div className="bg-gray-900 rounded-lg p-4 mb-8">
              <h3 className="text-lg font-semibold mb-4">Cumulative TP Earned</h3>
              <CumulativeTPChart data={playerData.cumulativeTP} />
            </div>

            {/* Ranking Chart */}
            <div className="bg-gray-900 rounded-lg p-4 mb-8">
              <h3 className="text-lg font-semibold mb-4">Ranking Over Time</h3>
              <p className="text-gray-500 text-sm mb-2">Lower is better</p>
              <RankingChart data={playerData.performances} position={playerData.position} />
            </div>

            {/* Price Chart */}
            <div className="bg-gray-900 rounded-lg p-4 mb-8">
              <h3 className="text-lg font-semibold mb-4">Price History (Limited Price Data For Now)</h3>
              <PriceChart data={playerData.priceHistory} />
            </div>

            {/* Performance Table */}
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                <h3 className="font-semibold">All Tournament Results</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Score</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Ranking</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">TP Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {[...playerData.performances].reverse().map((perf, index) => (
                      <tr key={index} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm text-gray-300">{perf.match_date}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-300">
                          {perf.raw_score ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {perf.ranking !== null ? (
                            <span className={perf.ranking <= 3 ? "text-yellow-400" : "text-gray-300"}>
                              #{perf.ranking}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {perf.reward && perf.reward > 0 ? (
                            <span className="text-green-400">{formatTP(perf.reward)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-900 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg">
              Select a player above to view their complete historical data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
