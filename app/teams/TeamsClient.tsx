"use client";

import { useState } from "react";
import { MarketCapByPosition } from "@/components/charts/MarketCapByPosition";
import { TeamLeaderboardChart } from "@/components/charts/TeamLeaderboardChart";

type TimeFilter = "1m" | "3m" | "all";

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "1m", label: "Last Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
];

interface PositionMarketCap {
  position: string;
  marketCap: number;
  playerCount: number;
}

interface TeamData {
  team: string;
  totalTP: number;
  totalMarketCap: number;
  totalCirculatingShares: number;
  playerCount: number;
  tpPerDollar: number;
}

interface TeamsClientProps {
  marketCapByPosition: PositionMarketCap[];
  teamData: Record<TimeFilter, TeamData[]>;
}

function formatTP(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatMarketCap(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function TeamsClient({ marketCapByPosition, teamData }: TeamsClientProps) {
  const [filter, setFilter] = useState<TimeFilter>("all");

  const currentTeamData = teamData[filter];
  const teamsByValue = [...currentTeamData].sort((a, b) => b.tpPerDollar - a.tpPerDollar);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Team Analytics</h1>
          <p className="text-gray-400">Market cap and performance by team and position</p>
        </div>

        {/* Market Cap by Position */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Market Cap by Position</h2>
          <MarketCapByPosition data={marketCapByPosition} />
        </div>

        {/* Time Filters */}
        <div className="flex gap-2 mb-6">
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setFilter(tf.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tf.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Team Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-xl font-semibold mb-4">Team TP Leaderboard</h2>
            <TeamLeaderboardChart data={currentTeamData.slice(0, 15)} metric="totalTP" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Team TP Efficiency</h2>
            <TeamLeaderboardChart data={teamsByValue.slice(0, 15)} metric="tpPerDollar" />
          </div>
        </div>

        {/* Team Tables */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* TP Leaderboard Table */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
              <h3 className="font-semibold">Total TP by Team</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Team</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Players</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Total TP</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Market Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {currentTeamData.slice(0, 20).map((team, index) => (
                  <tr key={team.team} className="hover:bg-gray-800/50">
                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium">{team.team}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400">{team.playerCount}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-green-400">
                      {formatTP(team.totalTP)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-gray-300">
                      {formatMarketCap(team.totalMarketCap)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Value Ranking Table */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
              <h3 className="font-semibold">Team TP Efficiency</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Team</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Total TP</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Market Cap</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {teamsByValue.slice(0, 20).map((team, index) => (
                  <tr key={team.team} className="hover:bg-gray-800/50">
                    <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium">{team.team}</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-green-400">
                      {formatTP(team.totalTP)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-gray-300">
                      {formatMarketCap(team.totalMarketCap)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-blue-400">
                      {formatTP(team.tpPerDollar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
