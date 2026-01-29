import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { MarketCapByPosition } from "@/components/charts/MarketCapByPosition";
import { TeamLeaderboardChart } from "@/components/charts/TeamLeaderboardChart";

export const revalidate = 300; // Cache for 5 minutes

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
    // Calculate market cap as price × circulating_shares
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

async function getTeamData(filter: TimeFilter): Promise<TeamData[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

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

  if (!players) return [];

  // Get TP data with pagination
  const playerTP: Record<string, number> = {};
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, reward")
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((p) => {
      if (p.reward && p.reward > 0) {
        playerTP[p.player_id] = (playerTP[p.player_id] || 0) + p.reward;
      }
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  // Aggregate by team
  const teamData: Record<string, { totalTP: number; totalMarketCap: number; totalCirculatingShares: number; playerCount: number }> = {};

  players.forEach((player) => {
    const team = player.team_name;
    if (!team) return;

    if (!teamData[team]) {
      teamData[team] = { totalTP: 0, totalMarketCap: 0, totalCirculatingShares: 0, playerCount: 0 };
    }

    const prices = player.prices as { price_usd: number }[] | null;
    const price = prices && prices.length > 0 ? prices[0].price_usd : 0;
    const circulatingShares = player.circulating_shares || 0;
    // Calculate market cap as price × circulating_shares
    const marketCap = price * circulatingShares;
    const tp = playerTP[player.id] || 0;

    teamData[team].totalTP += tp;
    teamData[team].totalMarketCap += marketCap;
    teamData[team].totalCirculatingShares += circulatingShares;
    teamData[team].playerCount++;
  });

  return Object.entries(teamData)
    .map(([team, data]) => ({
      team,
      totalTP: data.totalTP,
      totalMarketCap: data.totalMarketCap,
      totalCirculatingShares: data.totalCirculatingShares,
      playerCount: data.playerCount,
      // TP per $100 of market cap = (totalTP / totalMarketCap) * 100
      tpPerDollar: data.totalMarketCap > 0
        ? (data.totalTP / data.totalMarketCap) * 100
        : 0,
    }))
    .filter((t) => t.playerCount > 0)
    .sort((a, b) => b.totalTP - a.totalTP);
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

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as TimeFilter) || "all";

  const [marketCapByPosition, teamData] = await Promise.all([
    getMarketCapByPosition(),
    getTeamData(filter),
  ]);

  // Sort teams by TP per dollar for value ranking
  const teamsByValue = [...teamData].sort((a, b) => b.tpPerDollar - a.tpPerDollar);

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
            <Link
              key={tf.value}
              href={`/teams?filter=${tf.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tf.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tf.label}
            </Link>
          ))}
        </div>

        {/* Team Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-xl font-semibold mb-4">Team TP Leaderboard</h2>
            <TeamLeaderboardChart data={teamData.slice(0, 15)} metric="totalTP" />
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
                {teamData.slice(0, 20).map((team, index) => (
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
