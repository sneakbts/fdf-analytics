import { getSupabase } from "@/lib/supabase";
import { LeaderboardsClient } from "./LeaderboardsClient";

export const revalidate = 300; // Cache for 5 minutes

type TimeFilter = "1m" | "3m" | "all";

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

interface PerformanceRecord {
  player_id: string;
  match_date: string;
  reward: number | null;
  ranking: number | null;
}

async function getAllPerformanceData(supabase: ReturnType<typeof getSupabase>) {
  const performances: PerformanceRecord[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("performance")
      .select("player_id, match_date, reward, ranking")
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    performances.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return performances;
}

async function getTPLeaderboardForAllFilters(): Promise<Record<TimeFilter, PlayerTPData[]>> {
  const supabase = getSupabase();

  // Get all players
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, team_name, position, active_shares")
    .not("position", "is", null);

  if (!players) return { "1m": [], "3m": [], all: [] };

  // Get latest prices
  const playerIds = players.map((p) => p.id);
  const { data: prices } = await supabase
    .from("prices")
    .select("player_id, price_usd")
    .in("player_id", playerIds)
    .order("fetched_at", { ascending: false });

  const latestPriceByPlayer: Record<string, number> = {};
  prices?.forEach((p) => {
    if (!latestPriceByPlayer[p.player_id]) {
      latestPriceByPlayer[p.player_id] = p.price_usd;
    }
  });

  // Get ALL performance data once
  const allPerformances = await getAllPerformanceData(supabase);

  // Calculate stats for each time filter
  const filters: TimeFilter[] = ["1m", "3m", "all"];
  const result: Record<TimeFilter, PlayerTPData[]> = { "1m": [], "3m": [], all: [] };

  for (const filter of filters) {
    const startDate = getDateRange(filter);
    const startDateStr = startDate ? startDate.toISOString().split("T")[0] : null;

    // Filter performances by date
    const filteredPerformances = startDateStr
      ? allPerformances.filter((p) => p.match_date >= startDateStr)
      : allPerformances;

    // Aggregate stats
    const playerStats: Record<string, { totalTP: number; gamesPlayed: number; tpGames: number }> = {};
    filteredPerformances.forEach((p) => {
      if (!playerStats[p.player_id]) {
        playerStats[p.player_id] = { totalTP: 0, gamesPlayed: 0, tpGames: 0 };
      }
      playerStats[p.player_id].gamesPlayed++;
      if (p.reward && p.reward > 0) {
        playerStats[p.player_id].totalTP += p.reward;
        playerStats[p.player_id].tpGames++;
      }
    });

    // Build leaderboard
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

    result[filter] = leaderboard;
  }

  return result;
}

async function getVolatilityRankings(): Promise<PlayerVolatility[]> {
  const supabase = getSupabase();

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, team_name, position")
    .not("position", "is", null);

  if (!players) return [];

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

    const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const squaredDiffs = priceValues.map((p) => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / mean) * 100;

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

export default async function LeaderboardsPage() {
  const [tpData, volatilityRankings] = await Promise.all([
    getTPLeaderboardForAllFilters(),
    getVolatilityRankings(),
  ]);

  return (
    <LeaderboardsClient
      tpData={tpData}
      volatilityRankings={volatilityRankings}
    />
  );
}
