import { getSupabase } from "@/lib/supabase";
import { TeamsClient } from "./TeamsClient";

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

interface PlayerWithPrices {
  id: string;
  team_name: string | null;
  circulating_shares: number | null;
  prices: { price_usd: number }[] | null;
}

interface PerformanceRecord {
  player_id: string;
  match_date: string;
  reward: number | null;
}

async function getMarketCapByPosition(): Promise<PositionMarketCap[]> {
  const supabase = getSupabase();

  const { data: players } = await supabase
    .from("players")
    .select(`
      id,
      position,
      circulating_shares,
      prices (price_usd)
    `)
    .not("position", "is", null);

  if (!players) return [];

  const positionData: Record<string, { marketCap: number; playerCount: number }> = {
    Forward: { marketCap: 0, playerCount: 0 },
    Midfielder: { marketCap: 0, playerCount: 0 },
    Defender: { marketCap: 0, playerCount: 0 },
    Goalkeeper: { marketCap: 0, playerCount: 0 },
  };

  players.forEach((player) => {
    const position = player.position;
    if (!position || !positionData[position]) return;

    const prices = player.prices as { price_usd: number }[] | null;
    const price = prices && prices.length > 0 ? prices[0].price_usd : 0;
    const circulatingShares = player.circulating_shares || 0;
    const marketCap = price * circulatingShares;

    if (marketCap > 0) {
      positionData[position].marketCap += marketCap;
      positionData[position].playerCount++;
    }
  });

  return Object.entries(positionData).map(([position, data]) => ({
    position,
    marketCap: data.marketCap,
    playerCount: data.playerCount,
  }));
}

async function getAllPerformanceData(supabase: ReturnType<typeof getSupabase>): Promise<PerformanceRecord[]> {
  const performances: PerformanceRecord[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data } = await supabase
      .from("performance")
      .select("player_id, match_date, reward")
      .range(offset, offset + pageSize - 1);

    if (!data || data.length === 0) break;
    performances.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return performances;
}

async function getTeamDataForAllFilters(): Promise<Record<TimeFilter, TeamData[]>> {
  const supabase = getSupabase();

  // Get all players with team, prices, and circulating shares
  const { data: players } = await supabase
    .from("players")
    .select(`
      id,
      team_name,
      circulating_shares,
      prices (price_usd)
    `)
    .not("team_name", "is", null);

  if (!players) return { "1m": [], "3m": [], all: [] };

  // Get ALL performance data once
  const allPerformances = await getAllPerformanceData(supabase);

  // Calculate for each time filter
  const filters: TimeFilter[] = ["1m", "3m", "all"];
  const result: Record<TimeFilter, TeamData[]> = { "1m": [], "3m": [], all: [] };

  for (const filter of filters) {
    const startDate = getDateRange(filter);
    const startDateStr = startDate ? startDate.toISOString().split("T")[0] : null;

    // Filter performances by date
    const filteredPerformances = startDateStr
      ? allPerformances.filter((p) => p.match_date >= startDateStr)
      : allPerformances;

    // Aggregate TP by player
    const playerTP: Record<string, number> = {};
    filteredPerformances.forEach((p) => {
      if (p.reward && p.reward > 0) {
        playerTP[p.player_id] = (playerTP[p.player_id] || 0) + p.reward;
      }
    });

    // Aggregate by team
    const teamData: Record<string, { totalTP: number; totalMarketCap: number; totalCirculatingShares: number; playerCount: number }> = {};

    (players as PlayerWithPrices[]).forEach((player) => {
      const team = player.team_name;
      if (!team) return;

      if (!teamData[team]) {
        teamData[team] = { totalTP: 0, totalMarketCap: 0, totalCirculatingShares: 0, playerCount: 0 };
      }

      const prices = player.prices;
      const price = prices && prices.length > 0 ? prices[0].price_usd : 0;
      const circulatingShares = player.circulating_shares || 0;
      const marketCap = price * circulatingShares;
      const tp = playerTP[player.id] || 0;

      teamData[team].totalTP += tp;
      teamData[team].totalMarketCap += marketCap;
      teamData[team].totalCirculatingShares += circulatingShares;
      teamData[team].playerCount++;
    });

    result[filter] = Object.entries(teamData)
      .map(([team, data]) => ({
        team,
        totalTP: data.totalTP,
        totalMarketCap: data.totalMarketCap,
        totalCirculatingShares: data.totalCirculatingShares,
        playerCount: data.playerCount,
        tpPerDollar: data.totalMarketCap > 0
          ? (data.totalTP / data.totalMarketCap) * 100
          : 0,
      }))
      .filter((t) => t.playerCount > 0)
      .sort((a, b) => b.totalTP - a.totalTP);
  }

  return result;
}

export default async function TeamsPage() {
  const [marketCapByPosition, teamData] = await Promise.all([
    getMarketCapByPosition(),
    getTeamDataForAllFilters(),
  ]);

  return (
    <TeamsClient
      marketCapByPosition={marketCapByPosition}
      teamData={teamData}
    />
  );
}
