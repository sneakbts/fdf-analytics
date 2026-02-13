"use client";

import { useState, useMemo } from "react";
import { TPvsPriceChart } from "./TPvsPriceChart";

interface PlayerDataPoint {
  name: string;
  price: number;
  totalTP: number;
}

interface TPvsPriceSectionProps {
  dataByPosition: Record<string, PlayerDataPoint[]>;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

export function TPvsPriceSection({ dataByPosition }: TPvsPriceSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get all unique player names for autocomplete suggestions
  const allPlayerNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(dataByPosition).forEach((players) => {
      players.forEach((p) => names.add(p.name));
    });
    return Array.from(names).sort();
  }, [dataByPosition]);

  // Filter suggestions based on search term
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const lower = searchTerm.toLowerCase();
    return allPlayerNames
      .filter((name) => name.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [searchTerm, allPlayerNames]);

  // Find which position the highlighted player is in
  const highlightedPosition = useMemo(() => {
    if (!searchTerm) return null;
    const lower = searchTerm.toLowerCase();
    for (const [position, players] of Object.entries(dataByPosition)) {
      if (players.some((p) => p.name.toLowerCase().includes(lower))) {
        return position;
      }
    }
    return null;
  }, [searchTerm, dataByPosition]);

  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold mb-4">TP Won vs Price by Position</h2>
      <p className="text-gray-400 text-sm mb-4">
        Total TP earned compared to current token price. Search for a player to highlight them in gold.
      </p>

      {/* Search Bar */}
      <div className="relative mb-6 max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search player to highlight..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setSearchTerm(name);
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Highlighted player indicator */}
      {searchTerm && highlightedPosition && (
        <div className="mb-4 px-4 py-2 bg-yellow-900/30 border border-yellow-600/50 rounded-lg inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_8px_#FFD700]"></span>
          <span className="text-yellow-200">
            Highlighting: <strong>{searchTerm}</strong> in {highlightedPosition}
          </span>
        </div>
      )}

      {searchTerm && !highlightedPosition && (
        <div className="mb-4 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg inline-block">
          <span className="text-gray-400">No player found matching "{searchTerm}"</span>
        </div>
      )}

      {/* Charts */}
      <div className="flex flex-col gap-8">
        {(["Forward", "Midfielder", "Defender", "Goalkeeper"] as const).map((position) => (
          <TPvsPriceChart
            key={position}
            data={dataByPosition[position] || []}
            position={position}
            color={POSITION_COLORS[position]}
            height={500}
            highlightedPlayer={searchTerm}
          />
        ))}
      </div>
    </section>
  );
}
