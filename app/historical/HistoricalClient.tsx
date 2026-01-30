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
    worstRanking: number;
    tpRate: number;
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

function RankingChart({ data }: { data: PerformanceRecord[] }) {
  const rankingData = data.filter((d) => d.ranking !== null);

  if (rankingData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No ranking data available
      </div>
    );
  }

  const chartData = [
    {
      id: "Ranking",
      color: "#3B82F6",
      data: rankingData.map((d) => ({
        x: new Date(d.match_date),
        y: d.ranking,
      })),
    },
  ];

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: "time", format: "native", useUTC: false }}
        xFormat="time:%Y-%m-%d"
        yScale={{ type: "linear", min: 1, max: "auto", reverse: true }}
        curve="monotoneX"
        colors={["#3B82F6"]}
        lineWidth={2}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor="#3B82F6"
        pointColor="#1F2937"
        enableGridX={false}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: "%b %Y",
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
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
              <p className="text-blue-400 text-sm">Rank #{data.y}</p>
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
                subValue={`${playerData.stats.firstGame} to ${playerData.stats.lastGame}`}
              />
              <StatCard
                label="Total TP Earned"
                value={formatTP(playerData.stats.totalTP)}
                subValue={`${playerData.stats.tpRate.toFixed(1)}% TP rate`}
              />
              <StatCard
                label="Avg Score"
                value={playerData.stats.avgScore.toFixed(1)}
              />
              <StatCard
                label="Avg Ranking"
                value={playerData.stats.avgRanking.toFixed(1)}
              />
              <StatCard
                label="Best Ranking"
                value={`#${playerData.stats.bestRanking}`}
              />
              <StatCard
                label="Worst Ranking"
                value={`#${playerData.stats.worstRanking}`}
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Cumulative TP Earned</h3>
                <CumulativeTPChart data={playerData.cumulativeTP} />
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Ranking Over Time</h3>
                <p className="text-gray-500 text-sm mb-2">Lower is better</p>
                <RankingChart data={playerData.performances} />
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-gray-900 rounded-lg p-4 mb-8">
              <h3 className="text-lg font-semibold mb-4">Price History</h3>
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
