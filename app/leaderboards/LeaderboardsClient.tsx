"use client";

import { useState } from "react";
import Link from "next/link";

type TimeFilter = "1m" | "3m" | "all";

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "1m", label: "Last Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
];

interface PlayerTPData {
  id: string;
  name: string;
  team: string;
  position: string;
  totalTP: number;
  gamesPlayed: number;
  tpGames: number;
  price: number;
  activeShares: number;
}

interface PlayerVolatility {
  id: string;
  name: string;
  team: string;
  position: string;
  price: number;
  volatility: number;
  priceChange: number;
}

interface LeaderboardsClientProps {
  tpData: Record<TimeFilter, PlayerTPData[]>;
  volatilityRankings: PlayerVolatility[];
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

function getUndervaluedPlayers(leaderboard: PlayerTPData[]): (PlayerTPData & { tpPerDollar: number })[] {
  return leaderboard
    .filter((p) => p.price > 0 && p.activeShares > 0)
    .map((p) => ({
      ...p,
      tpPerDollar: (p.totalTP / p.activeShares) * (100 / p.price),
    }))
    .sort((a, b) => b.tpPerDollar - a.tpPerDollar);
}

export function LeaderboardsClient({ tpData, volatilityRankings }: LeaderboardsClientProps) {
  const [tab, setTab] = useState<"tp" | "volatility" | "value">("tp");
  const [filter, setFilter] = useState<TimeFilter>("all");

  const tpLeaderboard = tpData[filter];
  const undervaluedPlayers = getUndervaluedPlayers(tpLeaderboard);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboards</h1>
          <p className="text-gray-400">Rankings and performance metrics</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
          {[
            { value: "tp" as const, label: "TP Leaderboard" },
            { value: "volatility" as const, label: "Price Volatility" },
            { value: "value" as const, label: "Undervalued Players" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === t.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Time Filters (for TP and Value tabs) */}
        {(tab === "tp" || tab === "value") && (
          <div className="flex gap-2 mb-6">
            {TIME_FILTERS.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setFilter(tf.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tf.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        )}

        {/* TP Leaderboard */}
        {tab === "tp" && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Position</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Total TP</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Games</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">TP Rate</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tpLeaderboard.slice(0, 50).map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${index < 3 ? "text-yellow-500" : "text-gray-400"}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/players/${player.id}`} className="text-white hover:text-blue-400 font-medium">
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{player.team}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{player.position}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-400">
                      {formatTP(player.totalTP)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">{player.gamesPlayed}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {player.gamesPlayed > 0
                        ? `${((player.tpGames / player.gamesPlayed) * 100).toFixed(0)}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-300">
                      {formatPrice(player.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Volatility Rankings */}
        {tab === "volatility" && (
          <div>
            <p className="text-gray-400 text-sm mb-4">Based on price movements over the last 30 days</p>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Volatile */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="bg-red-900/30 px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-red-400">Most Volatile</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Player</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Volatility</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">30d Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {volatilityRankings.slice(0, 15).map((player) => (
                      <tr key={player.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-2">
                          <Link href={`/players/${player.id}`} className="text-sm text-white hover:text-blue-400">
                            {player.name}
                          </Link>
                          <p className="text-xs text-gray-500">{player.position}</p>
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-red-400">
                          {player.volatility.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-2 text-right text-sm font-mono ${
                          player.priceChange >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {player.priceChange >= 0 ? "+" : ""}{player.priceChange.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Most Stable */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="bg-green-900/30 px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-green-400">Most Stable</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Player</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Volatility</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">30d Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {[...volatilityRankings].reverse().slice(0, 15).map((player) => (
                      <tr key={player.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-2">
                          <Link href={`/players/${player.id}`} className="text-sm text-white hover:text-blue-400">
                            {player.name}
                          </Link>
                          <p className="text-xs text-gray-500">{player.position}</p>
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-mono text-green-400">
                          {player.volatility.toFixed(1)}%
                        </td>
                        <td className={`px-4 py-2 text-right text-sm font-mono ${
                          player.priceChange >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {player.priceChange >= 0 ? "+" : ""}{player.priceChange.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Undervalued Players */}
        {tab === "value" && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Position</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Total TP</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">TP per $100</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {undervaluedPlayers.slice(0, 50).map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${index < 3 ? "text-yellow-500" : "text-gray-400"}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/players/${player.id}`} className="text-white hover:text-blue-400 font-medium">
                        {player.name}
                      </Link>
                      <p className="text-xs text-gray-500">{player.team}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{player.position}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-400">
                      {formatTP(player.totalTP)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-300">
                      {formatPrice(player.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-400">
                      {formatTP(player.tpPerDollar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
