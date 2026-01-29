import { getSupabase } from "@/lib/supabase";
import { TPvsPriceChart } from "@/components/charts/TPvsPriceChart";
import { PositionTPStats } from "@/components/charts/PositionTPStats";
import { ConsistencyChart } from "@/components/charts/ConsistencyChart";
import { UniqueEarnersChart } from "@/components/charts/UniqueEarnersChart";
import { TopTPPlayersChart } from "@/components/charts/TopTPPlayersChart";
import Link from "next/link";

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

const POSITION_COLORS: Record<string, string> = {
  Forward: "#22C55E",
  Midfielder: "#3B82F6",
  Defender: "#F97316",
  Goalkeeper: "#A855F7",
};

// TP scoring thresholds by position
const TP_THRESHOLDS: Record<string, number> = {
  Forward: 5,
  Midfielder: 5,
  Defender: 5,
  Goalkeeper: 3,
};

interface PerformanceRecord {
  player_id: string;
  reward: number | null;
  ranking: number | null;
  raw_score: number | null;
  match_date: string;
}

async function getTPvsPriceData(filter: TimeFilter) {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  const { data: players } = await supabase
    .from("players")
    .select(`id, display_name, position`)
    .not("position", "is", null)
    .order("display_name");

  if (!players) return {};

  // Get latest prices separately (ordered by fetched_at desc)
  const playerIds = players.map((p) => p.id);
  const { data: prices } = await supabase
    .from("prices")
    .select("player_id, price_usd")
    .in("player_id", playerIds)
    .order("fetched_at", { ascending: false });

  // Map to get latest price per player (first occurrence = most recent)
  const latestPriceByPlayer: Record<string, number> = {};
  prices?.forEach((p) => {
    if (!latestPriceByPlayer[p.player_id]) {
      latestPriceByPlayer[p.player_id] = p.price_usd;
    }
  });

  const totalTPByPlayer: Record<string, number> = {};
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, reward, match_date")
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: rewards } = await query;
    if (!rewards || rewards.length === 0) break;

    rewards.forEach((r) => {
      if (r.reward) {
        totalTPByPlayer[r.player_id] = (totalTPByPlayer[r.player_id] || 0) + r.reward;
      }
    });

    if (rewards.length < pageSize) break;
    offset += pageSize;
  }

  const dataByPosition: Record<string, { name: string; price: number; totalTP: number }[]> = {
    Forward: [],
    Midfielder: [],
    Defender: [],
    Goalkeeper: [],
  };

  players.forEach((player) => {
    const position = player.position;
    if (!position || !dataByPosition[position]) return;

    const latestPrice = latestPriceByPlayer[player.id];
    if (!latestPrice || latestPrice <= 0) return;

    const totalTP = totalTPByPlayer[player.id] || 0;

    dataByPosition[position].push({
      name: player.display_name,
      price: latestPrice,
      totalTP: totalTP,
    });
  });

  return dataByPosition;
}

interface PositionStats {
  position: string;
  avgScore: number;
  highestScore: number;
  highestScorePlayer: string;
  lowestScore: number;
  lowestScorePlayer: string;
  tpThreshold: number;
}

async function getPositionStats(filter: TimeFilter): Promise<PositionStats[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  // Get players with positions
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, position")
    .not("position", "is", null);

  if (!players) return [];

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Get performance data - only where ranking qualifies for TP
  // Track all individual game scores with player names for finding true high/low
  const positionData: Record<string, { gameScores: { name: string; score: number }[] }> = {
    Forward: { gameScores: [] },
    Midfielder: { gameScores: [] },
    Defender: { gameScores: [] },
    Goalkeeper: { gameScores: [] },
  };

  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, raw_score, ranking")
      .not("raw_score", "is", null)
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((perf) => {
      const player = playerMap.get(perf.player_id);
      if (!player || !player.position || !perf.raw_score) return;

      const position = player.position;
      const threshold = TP_THRESHOLDS[position];

      // Only include if ranking qualifies for TP
      if (perf.ranking && perf.ranking <= threshold) {
        // Track every individual game score
        positionData[position].gameScores.push({
          name: player.display_name,
          score: perf.raw_score,
        });
      }
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  return Object.entries(positionData).map(([position, data]) => {
    const scores = data.gameScores.map((g) => g.score);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Sort by score to find actual highest and lowest individual games
    const sorted = [...data.gameScores].sort((a, b) => b.score - a.score);
    const highest = sorted[0] || { name: "-", score: 0 };
    const lowest = sorted[sorted.length - 1] || { name: "-", score: 0 };

    return {
      position,
      avgScore,
      highestScore: highest.score,
      highestScorePlayer: highest.name,
      lowestScore: lowest.score,
      lowestScorePlayer: lowest.name,
      tpThreshold: TP_THRESHOLDS[position],
    };
  });
}

interface PlayerConsistency {
  id: string;
  name: string;
  position: string;
  avgScore: number;
  stdDev: number;
  gamesPlayed: number;
}

async function getConsistencyData(filter: TimeFilter): Promise<PlayerConsistency[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, position")
    .not("position", "is", null);

  if (!players) return [];

  const playerScores: Record<string, number[]> = {};

  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, raw_score")
      .not("raw_score", "is", null)
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((perf) => {
      if (perf.raw_score !== null) {
        if (!playerScores[perf.player_id]) {
          playerScores[perf.player_id] = [];
        }
        playerScores[perf.player_id].push(perf.raw_score);
      }
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  return players
    .map((player) => {
      const scores = playerScores[player.id] || [];
      if (scores.length < 3) return null; // Need at least 3 games for meaningful std dev

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const squaredDiffs = scores.map((s) => Math.pow(s - avgScore, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      return {
        id: player.id,
        name: player.display_name,
        position: player.position,
        avgScore,
        stdDev,
        gamesPlayed: scores.length,
      };
    })
    .filter((p): p is PlayerConsistency => p !== null);
}

interface MonthlyUniqueEarners {
  month: string;
  byPosition: Record<string, number>;
}

async function getUniqueEarnersData(filter: TimeFilter): Promise<MonthlyUniqueEarners[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  const { data: players } = await supabase
    .from("players")
    .select("id, position")
    .not("position", "is", null);

  if (!players) return [];

  const playerPositions = new Map(players.map((p) => [p.id, p.position]));

  // Track unique player IDs per month per position
  const monthlyData: Record<string, Record<string, Set<string>>> = {};

  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, reward, match_date")
      .not("reward", "is", null)
      .gt("reward", 0)
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((perf) => {
      const position = playerPositions.get(perf.player_id);
      if (!position || !perf.match_date) return;

      const month = perf.match_date.substring(0, 7); // "2024-01" format

      if (!monthlyData[month]) {
        monthlyData[month] = {
          Forward: new Set(),
          Midfielder: new Set(),
          Defender: new Set(),
          Goalkeeper: new Set(),
        };
      }

      // Add player to the set for this position/month (sets handle uniqueness)
      monthlyData[month][position].add(perf.player_id);
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  return Object.entries(monthlyData)
    .map(([month, positionSets]) => ({
      month,
      byPosition: {
        Forward: positionSets.Forward.size,
        Midfielder: positionSets.Midfielder.size,
        Defender: positionSets.Defender.size,
        Goalkeeper: positionSets.Goalkeeper.size,
      },
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

interface TopTPPlayer {
  name: string;
  position: string;
  tpFinishes: number;
}

async function getTopTPPlayers(filter: TimeFilter): Promise<TopTPPlayer[]> {
  const supabase = getSupabase();
  const startDate = getDateRange(filter);

  // Get players with positions
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, position")
    .not("position", "is", null);

  if (!players) return [];

  const playerMap = new Map(players.map((p) => [p.id, { name: p.display_name, position: p.position }]));

  // Count TP finishes per player (rank 1-5 for field, 1-3 for GK)
  const tpCounts: Record<string, number> = {};

  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("performance")
      .select("player_id, ranking")
      .not("ranking", "is", null)
      .range(offset, offset + pageSize - 1);

    if (startDate) {
      query = query.gte("match_date", startDate.toISOString().split("T")[0]);
    }

    const { data: performances } = await query;
    if (!performances || performances.length === 0) break;

    performances.forEach((perf) => {
      const player = playerMap.get(perf.player_id);
      if (!player || !perf.ranking) return;

      const threshold = TP_THRESHOLDS[player.position] || 5;

      // Only count if ranking qualifies for TP
      if (perf.ranking <= threshold) {
        tpCounts[perf.player_id] = (tpCounts[perf.player_id] || 0) + 1;
      }
    });

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  // Convert to array and sort by count
  const result: TopTPPlayer[] = Object.entries(tpCounts)
    .map(([playerId, count]) => {
      const player = playerMap.get(playerId);
      return {
        name: player?.name || "Unknown",
        position: player?.position || "Unknown",
        tpFinishes: count,
      };
    })
    .sort((a, b) => b.tpFinishes - a.tpFinishes)
    .slice(0, 20); // Top 20

  return result;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as TimeFilter) || "all";

  const [dataByPosition, positionStats, consistencyData, uniqueEarnersData, topTPPlayers] = await Promise.all([
    getTPvsPriceData(filter),
    getPositionStats(filter),
    getConsistencyData(filter),
    getUniqueEarnersData(filter),
    getTopTPPlayers(filter),
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-400">Performance and price analytics across all players</p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex gap-2 mb-8">
          {TIME_FILTERS.map((tf) => (
            <Link
              key={tf.value}
              href={`/analytics?filter=${tf.value}`}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tf.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tf.label}
            </Link>
          ))}
        </div>

        {/* Position Score Stats */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Position Score Stats</h2>
          <p className="text-gray-400 text-sm mb-4">
            Average, highest, and lowest raw scores when players earn TP (rank 1-5 for field players, 1-3 for goalkeepers)
          </p>
          <PositionTPStats data={positionStats} />
        </section>

        {/* Top TP Players */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Top TP Earners</h2>
          <p className="text-gray-400 text-sm mb-4">
            Players with the most TP-earning finishes (rank 1-5 for field players, 1-3 for goalkeepers)
          </p>
          <TopTPPlayersChart data={topTPPlayers} height={600} />
        </section>

        {/* Unique TP Earners */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Unique TP Earners by Position</h2>
          <p className="text-gray-400 text-sm mb-4">
            Number of distinct players who earned TP each month. More earners = more competitive field.
          </p>
          <UniqueEarnersChart data={uniqueEarnersData} height={400} />
        </section>

        {/* Performance Consistency */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Performance Consistency</h2>
          <p className="text-gray-400 text-sm mb-4">
            Average raw score vs score volatility (standard deviation). Bottom-right = consistent high performers.
          </p>
          <ConsistencyChart data={consistencyData} height={500} />
        </section>

        {/* TP vs Price Charts */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">TP Won vs Price by Position</h2>
          <p className="text-gray-400 text-sm mb-4">
            Total TP earned compared to current token price
          </p>
          <div className="flex flex-col gap-8">
            {(["Forward", "Midfielder", "Defender", "Goalkeeper"] as const).map((position) => (
              <TPvsPriceChart
                key={position}
                data={dataByPosition[position] || []}
                position={position}
                color={POSITION_COLORS[position]}
                height={500}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
