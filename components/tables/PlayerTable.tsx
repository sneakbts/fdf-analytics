"use client";

import { useState } from "react";
import { PlayerWithLatestPrice } from "@/types";
import { formatPrice, formatLargeNumber, formatPercentChange } from "@/lib/utils";

interface PlayerTableProps {
  players: PlayerWithLatestPrice[];
}

type SortKey = "display_name" | "team_name" | "position" | "latest_price" | "latest_marketcap" | "price_change_24h";
type SortOrder = "asc" | "desc";

export function PlayerTable({ players }: PlayerTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("latest_marketcap");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      {sortKey === sortKeyName && (
        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-800">
          <tr>
            <SortHeader label="Player" sortKeyName="display_name" />
            <SortHeader label="Team" sortKeyName="team_name" />
            <SortHeader label="Position" sortKeyName="position" />
            <SortHeader label="Price" sortKeyName="latest_price" />
            <SortHeader label="Market Cap" sortKeyName="latest_marketcap" />
            <SortHeader label="24h Change" sortKeyName="price_change_24h" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sortedPlayers.map((player) => (
            <tr
              key={player.id}
              className="hover:bg-gray-800/50 transition-colors cursor-pointer"
              onClick={() => (window.location.href = `/players/${player.id}`)}
            >
              <td className="px-4 py-3">
                <span className="font-medium text-white">{player.display_name}</span>
              </td>
              <td className="px-4 py-3 text-gray-400">{player.team_name || "-"}</td>
              <td className="px-4 py-3 text-gray-400">{player.position || "-"}</td>
              <td className="px-4 py-3 font-mono text-white">
                {formatPrice(player.latest_price)}
              </td>
              <td className="px-4 py-3 font-mono text-gray-300">
                {formatLargeNumber(player.latest_marketcap)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    player.price_change_24h === null
                      ? "text-gray-500"
                      : player.price_change_24h >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {formatPercentChange(player.price_change_24h)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedPlayers.length === 0 && (
        <div className="text-center py-8 text-gray-500">No players found</div>
      )}
    </div>
  );
}
