import { getSupabase } from "@/lib/supabase";
import { HistoricalClient } from "./HistoricalClient";

export const revalidate = 300; // Cache for 5 minutes

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

async function getPlayerHistoricalData(playerId: string): Promise<PlayerHistoricalData | null> {
  const supabase = getSupabase();

  // Get player info
  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, team_name, position")
    .eq("id", playerId)
    .single();

  if (!player) return null;

  // Get all performance data for this player
  const { data: performances } = await supabase
    .from("performance")
    .select("match_date, raw_score, ranking, reward")
    .eq("player_id", playerId)
    .order("match_date", { ascending: true });

  if (!performances || performances.length === 0) {
    return {
      id: player.id,
      name: player.display_name,
      team: player.team_name || "Unknown",
      position: player.position || "Unknown",
      performances: [],
      cumulativeTP: [],
      priceHistory: [],
      stats: {
        totalGames: 0,
        totalTP: 0,
        avgScore: 0,
        avgRanking: 0,
        bestRanking: 0,
        tpRate: 0,
        tpGames: 0,
        firstGame: "-",
        lastGame: "-",
      },
    };
  }

  // Get price history
  const { data: prices } = await supabase
    .from("prices")
    .select("price_usd, fetched_at")
    .eq("player_id", playerId)
    .order("fetched_at", { ascending: true });

  // Calculate cumulative TP over time
  let runningTotal = 0;
  const cumulativeTP = performances
    .filter((p) => p.reward && p.reward > 0)
    .map((p) => {
      runningTotal += p.reward || 0;
      return { date: p.match_date, total: runningTotal };
    });

  // Process price history - get one price per day
  const priceByDay: Record<string, number> = {};
  (prices || []).forEach((p) => {
    const day = p.fetched_at.split("T")[0];
    priceByDay[day] = p.price_usd; // Last price of the day wins
  });
  const priceHistory = Object.entries(priceByDay)
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate stats
  const scores = performances.filter((p) => p.raw_score !== null).map((p) => p.raw_score!);
  const rankings = performances.filter((p) => p.ranking !== null).map((p) => p.ranking!);
  const tpGames = performances.filter((p) => p.reward && p.reward > 0).length;
  const totalTP = performances.reduce((sum, p) => sum + (p.reward || 0), 0);

  const stats = {
    totalGames: performances.length,
    totalTP,
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    avgRanking: rankings.length > 0 ? rankings.reduce((a, b) => a + b, 0) / rankings.length : 0,
    bestRanking: rankings.length > 0 ? Math.min(...rankings) : 0,
    tpRate: performances.length > 0 ? (tpGames / performances.length) * 100 : 0,
    tpGames,
    firstGame: performances[0].match_date,
    lastGame: performances[performances.length - 1].match_date,
  };

  return {
    id: player.id,
    name: player.display_name,
    team: player.team_name || "Unknown",
    position: player.position || "Unknown",
    performances,
    cumulativeTP,
    priceHistory,
    stats,
  };
}

export default async function HistoricalPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const params = await searchParams;
  const allPlayers = await getAllPlayers();

  let playerData: PlayerHistoricalData | null = null;
  if (params.player) {
    playerData = await getPlayerHistoricalData(params.player);
  }

  return (
    <HistoricalClient
      allPlayers={allPlayers}
      playerData={playerData}
      selectedPlayerId={params.player}
    />
  );
}
