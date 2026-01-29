import { getSupabase } from "@/lib/supabase";
import { CompareClient } from "./CompareClient";

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

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  team: string;
  position: string;
  currentPrice: number;
  marketCap: number;
  totalTP: number;
  gamesPlayed: number;
  tpGames: number;
  tpRate: number;
  avgScore: number;
  avgTP: number;
  tournamentRate: number; // % of tournaments played
  activeShares: number;
  tpHistory: { month: string; tp: number }[];
  rankingDistribution: Record<string, number>; // "1" -> count, "2" -> count, etc.
  recentGames: { date: string; score: number; ranking: number | null }[];
}

async function getAllPlayers(): Promise<Player[]> {
  const supabase = getSupabase();

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, team_name, position")
    .not("position", "is", null)
    .order("display_name");

  if (!players) return [];

  return players.map((p) => ({
    id: p.id,
    name: p.display_name,
    team: p.team_name || "Unknown",
    position: p.position || "Unknown",
  }));
}

// Get the last 10 unique match dates from all performances
async function getRecentMatchDates(filter: TimeFilter): Promise<string[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  let query = supabase
    .from("performance")
    .select("match_date")
    .order("match_date", { ascending: false });

  if (startDate) {
    query = query.gte("match_date", startDate.toISOString().split("T")[0]);
  }

  const { data } = await query;

  if (!data) return [];

  // Get unique dates
  const uniqueDates = [...new Set(data.map((d) => d.match_date))];
  return uniqueDates.slice(0, 10);
}

// Get total count of tournaments (unique match dates) within filter
async function getTotalTournamentCount(filter: TimeFilter): Promise<number> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  let query = supabase
    .from("performance")
    .select("match_date");

  if (startDate) {
    query = query.gte("match_date", startDate.toISOString().split("T")[0]);
  }

  const { data } = await query;

  if (!data) return 0;

  const uniqueDates = new Set(data.map((d) => d.match_date));
  return uniqueDates.size;
}

async function getPlayerStats(playerId: string, recentMatchDates: string[], totalTournaments: number, filter: TimeFilter): Promise<PlayerStats | null> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  // Get player info
  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, team_name, position, active_shares, circulating_shares")
    .eq("id", playerId)
    .single();

  if (!player) return null;

  // Get latest price
  const { data: latestPrice } = await supabase
    .from("prices")
    .select("price_usd")
    .eq("player_id", playerId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  const currentPrice = latestPrice?.price_usd || 0;
  // Calculate market cap as price × circulating_shares (for display)
  const marketCap = currentPrice * (player.circulating_shares || 0);

  // Get performance data with time filter
  let perfQuery = supabase
    .from("performance")
    .select("match_date, reward, raw_score, ranking")
    .eq("player_id", playerId)
    .order("match_date", { ascending: true });

  if (startDate) {
    perfQuery = perfQuery.gte("match_date", startDate.toISOString().split("T")[0]);
  }

  const { data: performances } = await perfQuery;

  let totalTP = 0;
  let gamesPlayed = 0;
  let tpGames = 0;
  let totalScore = 0;
  const monthlyTP: Record<string, number> = {};
  const rankingDistribution: Record<string, number> = {};

  // Create a map of this player's performances by date
  const perfByDate = new Map<string, { score: number; ranking: number }>();

  (performances || []).forEach((p) => {
    gamesPlayed++;
    if (p.raw_score) totalScore += p.raw_score;
    if (p.reward && p.reward > 0) {
      totalTP += p.reward;
      tpGames++;

      const month = p.match_date.substring(0, 7);
      monthlyTP[month] = (monthlyTP[month] || 0) + p.reward;
    }

    // Track ranking distribution
    if (p.ranking !== null) {
      const rankKey = p.ranking <= 5 ? String(p.ranking) : "6+";
      rankingDistribution[rankKey] = (rankingDistribution[rankKey] || 0) + 1;
    }

    // Store for recent games lookup
    perfByDate.set(p.match_date, {
      score: p.raw_score || 0,
      ranking: p.ranking,
    });
  });

  const tpHistory = Object.entries(monthlyTP)
    .map(([month, tp]) => ({ month, tp }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Build recent games from the global match dates (includes DNPs)
  const recentGames = recentMatchDates.map((date) => {
    const perf = perfByDate.get(date);
    if (perf) {
      return {
        date,
        score: perf.score,
        ranking: perf.ranking,
      };
    } else {
      // DNP - no record for this date
      return {
        date,
        score: 0,
        ranking: null,
      };
    }
  });

  return {
    id: player.id,
    name: player.display_name,
    team: player.team_name || "Unknown",
    position: player.position || "Unknown",
    currentPrice,
    marketCap,
    totalTP,
    gamesPlayed,
    tpGames,
    tpRate: gamesPlayed > 0 ? (tpGames / gamesPlayed) * 100 : 0,
    avgScore: gamesPlayed > 0 ? totalScore / gamesPlayed : 0,
    avgTP: tpGames > 0 ? totalTP / tpGames : 0,
    tournamentRate: totalTournaments > 0 ? (gamesPlayed / totalTournaments) * 100 : 0,
    activeShares: player.active_shares || 0,
    tpHistory,
    rankingDistribution,
    recentGames,
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ p1?: string; p2?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as TimeFilter) || "all";

  const [allPlayers, recentMatchDates, totalTournaments] = await Promise.all([
    getAllPlayers(),
    getRecentMatchDates(filter),
    getTotalTournamentCount(filter),
  ]);

  let player1Stats: PlayerStats | null = null;
  let player2Stats: PlayerStats | null = null;

  if (params.p1) {
    player1Stats = await getPlayerStats(params.p1, recentMatchDates, totalTournaments, filter);
  }
  if (params.p2) {
    player2Stats = await getPlayerStats(params.p2, recentMatchDates, totalTournaments, filter);
  }

  return (
    <CompareClient
      allPlayers={allPlayers}
      player1Stats={player1Stats}
      player2Stats={player2Stats}
      selectedP1={params.p1}
      selectedP2={params.p2}
      currentFilter={filter}
      timeFilters={TIME_FILTERS}
    />
  );
}
