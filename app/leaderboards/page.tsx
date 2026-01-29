import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

type TimeFilter = "1m" | "3m" | "all";

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "1m", label: "Last Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
];

function getDateRange(filter: TimeFilter): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  if (filter === "1m") {
    return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
  if (filter === "3m") {
    return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  }
  return null;
}

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

async function getTPLeaderboard(filter: TimeFilter): Promise<PlayerTPData[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  // Get all players
  const { data: players } = await supabase
    .from("players")
    .select(`id, display_name, team_name, position, active_shares`)
    .not("position", "is", null);

  if (!players) return [];

  // Get latest prices separately (ordered by fetched_at desc)
  const playerIds = players.map((p) => p.id);
  const { data: prices } = await supabase
    .from("prices")
    .select("player_id, price_usd")
    .in("player_id", playerIds)
    .order("fetched_at", { ascending: false });

  // Map to get latest price per player
  const latestPriceByPlayer: Record<string, number> = {};
  prices?.forEach((p) => {
    if (!latestPriceByPlayer[p.player_id]) {
      latestPriceByPlayer[p.player_id] = p.price_usd;
    }
  });

  // Get performance data with pagination
  const playerStats: Record<string, { totalTP: number; gamesPlayed: number; tpGames: number }> = {};
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, reward, ranking")
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((p) => {
      if (!playerStats[p.player_id]) {
        playerStats[p.player_id] = { totalTP: 0, gamesPlayed: 0, tpGames: 0 };
      }
      playerStats[p.player_id].gamesPlayed++;
      if (p.reward && p.reward > 0) {
        playerStats[p.player_id].totalTP += p.reward;
        playerStats[p.player_id].tpGames++;
      }
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  // Combine data
  const leaderboard: PlayerTPData[] = players
    .map((player) => {
      const stats = playerStats[player.id] || { totalTP: 0, gamesPlayed: 0, tpGames: 0 };
      const price = latestPriceByPlayer[player.id] || 0;

      return {
        id: player.id,
        name: player.display_name,
        team: player.team_name || "Unknown",
        position: player.position || "Unknown",
        totalTP: stats.totalTP,
        gamesPlayed: stats.gamesPlayed,
        tpGames: stats.tpGames,
        price,
        activeShares: player.active_shares || 0,
      };
    })
    .filter((p) => p.totalTP > 0)
    .sort((a, b) => b.totalTP - a.totalTP);

  return leaderboard;
}

async function getVolatilityRankings(): Promise<PlayerVolatility[]> {
  const supabase = getSupabase();

  // Get players
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, team_name, position")
    .not("position", "is", null);

  if (!players) return [];

  // Get price history for each player (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const volatilityData: PlayerVolatility[] = [];

  for (const player of players) {
    const { data: prices } = await supabase
      .from("prices")
      .select("price_usd, fetched_at")
      .eq("player_id", player.id)
      .gte("fetched_at", thirtyDaysAgo.toISOString())
      .order("fetched_at", { ascending: true });

    if (!prices || prices.length < 2) continue;

    const priceValues = prices.map((p) => p.price_usd);
    const currentPrice = priceValues[priceValues.length - 1];
    const oldestPrice = priceValues[0];

    // Calculate volatility (standard deviation / mean)
    const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const squaredDiffs = priceValues.map((p) => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / mean) * 100; // as percentage

    const priceChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;

    volatilityData.push({
      id: player.id,
      name: player.display_name,
      team: player.team_name || "Unknown",
      position: player.position || "Unknown",
      price: currentPrice,
      volatility,
      priceChange,
    });
  }

  return volatilityData.sort((a, b) => b.volatility - a.volatility);
}

async function getUndervaluedPlayers(filter: TimeFilter): Promise<(PlayerTPData & { tpPerDollar: number })[]> {
  const leaderboard = await getTPLeaderboard(filter);

  return leaderboard
    .filter((p) => p.price > 0 && p.activeShares > 0)
    .map((p) => ({
      ...p,
      // TP per $100 = (totalTP / activeShares) * (100 / price)
      tpPerDollar: (p.totalTP / p.activeShares) * (100 / p.price),
    }))
    .sort((a, b) => b.tpPerDollar - a.tpPerDollar);
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

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as TimeFilter) || "all";
  const tab = params.tab || "tp";

  const [tpLeaderboard, volatilityRankings, undervaluedPlayers] = await Promise.all([
    getTPLeaderboard(filter),
    getVolatilityRankings(),
    getUndervaluedPlayers(filter),
  ]);

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
            { value: "tp", label: "TP Leaderboard" },
            { value: "volatility", label: "Price Volatility" },
            { value: "value", label: "Undervalued Players" },
          ].map((t) => (
            <Link
              key={t.value}
              href={`/leaderboards?tab=${t.value}&filter=${filter}`}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === t.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Time Filters (for TP and Value tabs) */}
        {(tab === "tp" || tab === "value") && (
          <div className="flex gap-2 mb-6">
            {TIME_FILTERS.map((tf) => (
              <Link
                key={tf.value}
                href={`/leaderboards?tab=${tab}&filter=${tf.value}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tf.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tf.label}
              </Link>
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
