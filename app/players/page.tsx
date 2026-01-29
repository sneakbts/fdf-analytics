import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlayerTable } from "@/components/tables/PlayerTable";
import { PlayerWithLatestPrice } from "@/types";

async function getPlayersWithPrices(): Promise<PlayerWithLatestPrice[]> {
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("display_name");

  if (!players || players.length === 0) return [];

  const playerIds = players.map((p) => p.id);

  // Get latest prices for each player (no time filter)
  const { data: latestPrices } = await supabase
    .from("prices")
    .select("player_id, price_usd, fetched_at")
    .in("player_id", playerIds)
    .order("fetched_at", { ascending: false });

  // Get prices from ~24 hours ago for change calculation
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: oldPrices } = await supabase
    .from("prices")
    .select("player_id, price_usd")
    .in("player_id", playerIds)
    .lte("fetched_at", oneDayAgo)
    .order("fetched_at", { ascending: false });

  // Map latest prices by player (first occurrence = most recent)
  const latestByPlayer = new Map<string, number>();
  latestPrices?.forEach((p) => {
    if (!latestByPlayer.has(p.player_id)) {
      latestByPlayer.set(p.player_id, p.price_usd);
    }
  });

  // Map old prices by player
  const oldByPlayer = new Map<string, number>();
  oldPrices?.forEach((p) => {
    if (!oldByPlayer.has(p.player_id)) {
      oldByPlayer.set(p.player_id, p.price_usd);
    }
  });

  return players.map((player) => {
    const latestPrice = latestByPlayer.get(player.id);
    const oldPrice = oldByPlayer.get(player.id);
    let priceChange = null;

    if (latestPrice && oldPrice && oldPrice > 0) {
      priceChange = ((latestPrice - oldPrice) / oldPrice) * 100;
    }

    // Calculate market cap as price × circulating_shares
    const marketcap = latestPrice && player.circulating_shares
      ? latestPrice * player.circulating_shares
      : null;

    return {
      ...player,
      latest_price: latestPrice || null,
      latest_marketcap: marketcap,
      price_change_24h: priceChange,
    };
  });
}

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await getPlayersWithPrices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">All Players</h1>
        <p className="text-gray-400 mt-2">
          {players.length} players tracked
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <PlayerTable players={players} />
        </CardContent>
      </Card>
    </div>
  );
}
