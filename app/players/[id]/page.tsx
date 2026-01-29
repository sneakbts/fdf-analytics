import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PriceChart } from "@/components/charts/PriceChart";
import { PerformanceTable } from "@/components/tables/PerformanceTable";
import { formatPrice, formatLargeNumber } from "@/lib/utils";
import { notFound } from "next/navigation";

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

async function getPlayerData(id: string) {
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) return null;

  // Get price history (last 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: prices } = await supabase
    .from("prices")
    .select("price_usd, marketcap_usd, holder_count, fetched_at")
    .eq("player_id", id)
    .gte("fetched_at", thirtyDaysAgo)
    .order("fetched_at", { ascending: true });

  // Get performance data
  const { data: performances } = await supabase
    .from("performance")
    .select("*")
    .eq("player_id", id)
    .order("match_date", { ascending: false });

  const latestPrice = prices?.[prices.length - 1];
  // Calculate market cap as price × circulating_shares
  const marketcap = latestPrice?.price_usd && player.circulating_shares
    ? latestPrice.price_usd * player.circulating_shares
    : null;

  return {
    player,
    prices: prices || [],
    performances: performances || [],
    latestPrice: latestPrice?.price_usd || null,
    latestMarketcap: marketcap,
    holderCount: latestPrice?.holder_count || null,
  };
}

export const revalidate = 300; // Cache for 5 minutes

export default async function PlayerDetailPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const data = await getPlayerData(id);

  if (!data) {
    notFound();
  }

  const { player, prices, performances, latestPrice, latestMarketcap, holderCount } =
    data;

  const priceChartData = prices.map((p) => ({
    date: p.fetched_at,
    price: p.price_usd,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{player.display_name}</h1>
        <div className="flex gap-4 mt-2 text-gray-400">
          {player.team_name && <span>{player.team_name}</span>}
          {player.position && (
            <>
              <span>-</span>
              <span>{player.position}</span>
            </>
          )}
          {player.token_symbol && (
            <>
              <span>-</span>
              <span className="font-mono">${player.token_symbol}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {formatPrice(latestPrice)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {formatLargeNumber(latestMarketcap)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {holderCount?.toLocaleString() || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price History (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceChart data={priceChartData} height={350} />
        </CardContent>
      </Card>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceTable performances={performances} />
        </CardContent>
      </Card>
    </div>
  );
}
