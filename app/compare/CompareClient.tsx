"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import type { PlayerStats } from "./page";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
}

interface TimeFilter {
  value: string;
  label: string;
}

interface CompareClientProps {
  allPlayers: Player[];
  player1Stats: PlayerStats | null;
  player2Stats: PlayerStats | null;
  selectedP1?: string;
  selectedP2?: string;
  currentFilter: string;
  timeFilters: TimeFilter[];
}

const COLORS = {
  player1: "#3B82F6", // Blue
  player2: "#22C55E", // Green
};

function formatTP(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPrice(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function formatMarketCap(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function PlayerSelector({
  players,
  selectedId,
  onSelect,
  label,
  color,
}: {
  players: Player[];
  selectedId?: string;
  onSelect: (id: string) => void;
  label: string;
  color: string;
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
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div
        className="bg-gray-800 border-2 rounded-lg p-3 cursor-pointer hover:border-gray-600 transition-colors"
        style={{ borderColor: selectedPlayer ? color : "#374151" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedPlayer ? (
          <div>
            <p className="text-white font-medium">{selectedPlayer.name}</p>
            <p className="text-gray-400 text-sm">
              {selectedPlayer.team} • {selectedPlayer.position}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">Click to select a player...</p>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-60">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors ${
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

function RankingDistributionChart({
  player1,
  player2,
}: {
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}) {
  const chartData = useMemo(() => {
    const ranks = ["1", "2", "3", "4", "5", "6+"];
    return ranks.map((rank) => ({
      rank,
      [player1?.name || "Player 1"]: player1?.rankingDistribution[rank] || 0,
      [player2?.name || "Player 2"]: player2?.rankingDistribution[rank] || 0,
    }));
  }, [player1, player2]);

  const keys = [
    player1?.name || "Player 1",
    player2?.name || "Player 2",
  ].filter((_, i) => (i === 0 ? player1 : player2));

  if (!player1 && !player2) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Select players to compare ranking distribution
      </div>
    );
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveBar
        data={chartData}
        keys={keys}
        indexBy="rank"
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        padding={0.3}
        groupMode="grouped"
        colors={[COLORS.player1, COLORS.player2]}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Rank",
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Games",
          legendPosition: "middle",
          legendOffset: -50,
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
        tooltip={({ id, value, indexValue }) => (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
            <p className="text-white font-medium text-sm">{String(id)}</p>
            <p className="text-gray-400 text-sm">
              Rank {indexValue}: {value} games
            </p>
          </div>
        )}
      />
    </div>
  );
}

function RecentFormChart({
  player1,
  player2,
}: {
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}) {
  const DNP_VALUE = 30; // Value used to plot DNPs at the bottom

  const chartData = useMemo(() => {
    const lines = [];

    if (player1 && player1.recentGames.length > 0) {
      lines.push({
        id: player1.name,
        color: COLORS.player1,
        data: player1.recentGames.map((g, i) => ({
          x: i + 1,
          y: g.ranking !== null ? g.ranking : DNP_VALUE,
          date: g.date,
          score: g.score,
          isDNP: g.ranking === null,
        })),
      });
    }

    if (player2 && player2.recentGames.length > 0) {
      lines.push({
        id: player2.name,
        color: COLORS.player2,
        data: player2.recentGames.map((g, i) => ({
          x: i + 1,
          y: g.ranking !== null ? g.ranking : DNP_VALUE,
          date: g.date,
          score: g.score,
          isDNP: g.ranking === null,
        })),
      });
    }

    return lines;
  }, [player1, player2]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Select players to compare recent form
      </div>
    );
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        xScale={{ type: "point" }}
        yScale={{ type: "linear", min: 1, max: DNP_VALUE, reverse: true }}
        curve="monotoneX"
        colors={chartData.map((d) => d.color)}
        lineWidth={2}
        pointSize={8}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointColor="#1F2937"
        enableGridX={false}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Games Ago (1 = most recent)",
          legendPosition: "middle",
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Rank",
          legendPosition: "middle",
          legendOffset: -50,
          tickValues: [1, 5, 10, 15, 20, 25, DNP_VALUE],
          format: (v) => (v === DNP_VALUE ? "DNP" : String(v)),
        }}
        theme={{
          background: "transparent",
          text: { fill: "#9CA3AF" },
          axis: {
            ticks: { text: { fill: "#9CA3AF" } },
            legend: { text: { fill: "#9CA3AF" } },
          },
          grid: { line: { stroke: "#374151", strokeDasharray: "3 3" } },
          crosshair: { line: { stroke: "#9CA3AF", strokeWidth: 1 } },
        }}
        useMesh={true}
        tooltip={({ point }) => {
          const data = point.data as { x: number; y: number; date?: string; score?: number; isDNP?: boolean };
          return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <p className="text-white font-medium text-sm">{point.seriesId}</p>
              <p className="text-gray-400 text-sm">
                {data.date}: {data.isDNP ? "DNP" : `Rank ${data.y}`}
                {!data.isDNP && data.score && ` (Score: ${data.score})`}
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}

function TPComparisonChart({
  player1,
  player2,
}: {
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}) {
  const chartData = useMemo(() => {
    const lines = [];

    // Each player only includes months where they have data (connects the dots)
    // Use Date objects for x values so time scale works properly
    if (player1 && player1.tpHistory.length > 0) {
      const sortedData = [...player1.tpHistory].sort((a, b) => {
        return new Date(a.month + "-01").getTime() - new Date(b.month + "-01").getTime();
      });
      lines.push({
        id: player1.name,
        color: COLORS.player1,
        data: sortedData.map((p) => ({
          x: new Date(p.month + "-01"),
          y: p.tp,
          month: p.month,
        })),
      });
    }

    if (player2 && player2.tpHistory.length > 0) {
      const sortedData = [...player2.tpHistory].sort((a, b) => {
        return new Date(a.month + "-01").getTime() - new Date(b.month + "-01").getTime();
      });
      lines.push({
        id: player2.name,
        color: COLORS.player2,
        data: sortedData.map((p) => ({
          x: new Date(p.month + "-01"),
          y: p.tp,
          month: p.month,
        })),
      });
    }

    return lines;
  }, [player1, player2]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Select players to compare TP history
      </div>
    );
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
        xScale={{ type: "time", format: "native", useUTC: false }}
        xFormat="time:%Y-%m"
        yScale={{ type: "linear", min: 0, max: "auto" }}
        curve="monotoneX"
        colors={chartData.map((d) => d.color)}
        lineWidth={2}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointColor="#1F2937"
        enableGridX={false}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: "%Y-%m",
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
          const data = point.data as { x: Date; y: number; month?: string };
          return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <p className="text-white font-medium text-sm">{point.seriesId}</p>
              <p className="text-gray-400 text-sm">
                {data.month || point.data.xFormatted}: {formatTP(data.y)} TP
              </p>
            </div>
          );
        }}
      />
    </div>
  );
}

function ROICalculator({
  player1,
  player2,
}: {
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}) {
  const [investment, setInvestment] = useState(100);

  const calculateROI = (player: PlayerStats | null) => {
    if (!player || player.currentPrice <= 0) return null;

    const tokensOwned = investment / player.currentPrice;
    // TP per $100 = (totalTP / activeShares) * (100 / price)
    const tpPerDollar = player.activeShares > 0
      ? (player.totalTP / player.activeShares) * (investment / player.currentPrice)
      : 0;

    return {
      tokensOwned,
      totalTP: player.totalTP,
      tpRate: player.tpRate,
      tpPerDollar,
      gamesPlayed: player.gamesPlayed,
      activeShares: player.activeShares,
    };
  };

  const roi1 = calculateROI(player1);
  const roi2 = calculateROI(player2);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">ROI Calculator</h3>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-lg">$</span>
          <input
            type="number"
            value={investment}
            onChange={(e) => setInvestment(Math.max(1, Number(e.target.value) || 1))}
            className="w-28 bg-gray-800 border-2 border-blue-600 rounded-lg px-3 py-2 text-xl font-bold text-white text-center focus:outline-none focus:border-blue-400"
            min="1"
          />
          <span className="text-gray-400 text-sm">Investment</span>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Based on current price and all-time performance
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Player 1 ROI */}
        <div
          className="bg-gray-800 rounded-lg p-4 border-t-4"
          style={{ borderTopColor: player1 ? COLORS.player1 : "#374151" }}
        >
          <p className="text-gray-400 text-sm mb-2">{player1?.name || "Player 1"}</p>
          {roi1 ? (
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-xs">Shares @ {formatPrice(player1!.currentPrice)}</p>
                <p className="text-xl font-bold text-white">{roi1.tokensOwned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Career TP Earned</p>
                <p className="text-lg font-semibold text-green-400">{formatTP(roi1.totalTP)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">TP Rate ({roi1.gamesPlayed} games)</p>
                <p className="text-lg font-semibold text-blue-400">{roi1.tpRate.toFixed(1)}%</p>
              </div>
              <div className="pt-2 border-t border-gray-700">
                <p className="text-gray-500 text-xs">TP per ${investment}</p>
                <p className="text-lg font-bold text-yellow-400">{formatTP(roi1.tpPerDollar)}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a player</p>
          )}
        </div>

        {/* Player 2 ROI */}
        <div
          className="bg-gray-800 rounded-lg p-4 border-t-4"
          style={{ borderTopColor: player2 ? COLORS.player2 : "#374151" }}
        >
          <p className="text-gray-400 text-sm mb-2">{player2?.name || "Player 2"}</p>
          {roi2 ? (
            <div className="space-y-3">
              <div>
                <p className="text-gray-500 text-xs">Shares @ {formatPrice(player2!.currentPrice)}</p>
                <p className="text-xl font-bold text-white">{roi2.tokensOwned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Career TP Earned</p>
                <p className="text-lg font-semibold text-green-400">{formatTP(roi2.totalTP)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">TP Rate ({roi2.gamesPlayed} games)</p>
                <p className="text-lg font-semibold text-blue-400">{roi2.tpRate.toFixed(1)}%</p>
              </div>
              <div className="pt-2 border-t border-gray-700">
                <p className="text-gray-500 text-xs">TP per ${investment}</p>
                <p className="text-lg font-bold text-yellow-400">{formatTP(roi2.tpPerDollar)}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a player</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatComparison({
  player1,
  player2,
}: {
  player1: PlayerStats | null;
  player2: PlayerStats | null;
}) {
  const stats = [
    { label: "Current Price", key: "currentPrice", format: formatPrice },
    { label: "Market Cap", key: "marketCap", format: formatMarketCap },
    { label: "Total TP", key: "totalTP", format: formatTP },
    { label: "Games Played", key: "gamesPlayed", format: (v: number) => v.toString() },
    { label: "% Tournaments Played", key: "tournamentRate", format: (v: number) => `${v.toFixed(1)}%` },
    { label: "TP Rate", key: "tpRate", format: (v: number) => `${v.toFixed(1)}%` },
    { label: "Avg Score", key: "avgScore", format: (v: number) => v.toFixed(1) },
    { label: "Avg TP", key: "avgTP", format: formatTP },
  ];

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Stat</th>
            <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: COLORS.player1 }}>
              {player1?.name || "Player 1"}
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: COLORS.player2 }}>
              {player2?.name || "Player 2"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {stats.map((stat) => {
            const val1 = player1 ? (player1 as any)[stat.key] : null;
            const val2 = player2 ? (player2 as any)[stat.key] : null;

            // Determine winner (higher is better for all these stats)
            let winner: "p1" | "p2" | null = null;
            if (val1 !== null && val2 !== null) {
              if (val1 > val2) winner = "p1";
              else if (val2 > val1) winner = "p2";
            }

            return (
              <tr key={stat.key} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 text-sm text-gray-400">{stat.label}</td>
                <td
                  className={`px-4 py-3 text-sm text-center font-mono ${
                    winner === "p1" ? "text-blue-400 font-semibold" : "text-gray-300"
                  }`}
                >
                  {val1 !== null ? stat.format(val1) : "-"}
                </td>
                <td
                  className={`px-4 py-3 text-sm text-center font-mono ${
                    winner === "p2" ? "text-green-400 font-semibold" : "text-gray-300"
                  }`}
                >
                  {val2 !== null ? stat.format(val2) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CompareClient({
  allPlayers,
  player1Stats,
  player2Stats,
  selectedP1,
  selectedP2,
  currentFilter,
  timeFilters,
}: CompareClientProps) {
  const router = useRouter();

  const handleSelectPlayer = (slot: 1 | 2, playerId: string) => {
    const params = new URLSearchParams();
    if (slot === 1) {
      params.set("p1", playerId);
      if (selectedP2) params.set("p2", selectedP2);
    } else {
      if (selectedP1) params.set("p1", selectedP1);
      params.set("p2", playerId);
    }
    if (currentFilter !== "all") params.set("filter", currentFilter);
    router.push(`/compare?${params.toString()}`);
  };

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams();
    if (selectedP1) params.set("p1", selectedP1);
    if (selectedP2) params.set("p2", selectedP2);
    if (filter !== "all") params.set("filter", filter);
    router.push(`/compare?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Compare Players</h1>
          <p className="text-gray-400">Head-to-head comparison of two players</p>
        </div>

        {/* Time Filters */}
        <div className="flex gap-2 mb-6">
          {timeFilters.map((tf) => (
            <button
              key={tf.value}
              onClick={() => handleFilterChange(tf.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentFilter === tf.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Player Selectors */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <PlayerSelector
            players={allPlayers}
            selectedId={selectedP1}
            onSelect={(id) => handleSelectPlayer(1, id)}
            label="Player 1"
            color={COLORS.player1}
          />
          <PlayerSelector
            players={allPlayers}
            selectedId={selectedP2}
            onSelect={(id) => handleSelectPlayer(2, id)}
            label="Player 2"
            color={COLORS.player2}
          />
        </div>

        {/* ROI Calculator */}
        <section className="mb-8">
          <ROICalculator player1={player1Stats} player2={player2Stats} />
        </section>

        {/* Stats Comparison Table */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Stats Comparison</h2>
          <StatComparison player1={player1Stats} player2={player2Stats} />
        </section>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Ranking Distribution */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Ranking Distribution</h2>
            <p className="text-gray-400 text-sm mb-4">How often each player finishes at each rank</p>
            <div className="bg-gray-900 rounded-lg p-4">
              <RankingDistributionChart player1={player1Stats} player2={player2Stats} />
            </div>
          </section>

          {/* Recent Form */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Recent Form (Last 10 Games)</h2>
            <p className="text-gray-400 text-sm mb-4">Performance in most recent matches</p>
            <div className="bg-gray-900 rounded-lg p-4">
              <RecentFormChart player1={player1Stats} player2={player2Stats} />
            </div>
          </section>
        </div>

        {/* TP Chart */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Monthly TP Earned</h2>
          <div className="bg-gray-900 rounded-lg p-4">
            <TPComparisonChart player1={player1Stats} player2={player2Stats} />
          </div>
        </section>

        {/* Legend */}
        {(player1Stats || player2Stats) && (
          <div className="flex justify-center gap-8 mt-6">
            {player1Stats && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.player1 }} />
                <span className="text-gray-300">{player1Stats.name}</span>
              </div>
            )}
            {player2Stats && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.player2 }} />
                <span className="text-gray-300">{player2Stats.name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
