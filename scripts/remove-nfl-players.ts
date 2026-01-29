/**
 * Remove all players that don't have performance data (NFL players).
 * Only keeps players that appear in the Excel spreadsheet.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Finding NFL players to remove...\n");

  // Get all players
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, display_name");

  if (!allPlayers) {
    console.log("No players found");
    return;
  }

  // Get players that have performance data (with pagination to handle >1000 records)
  let allPerf: { player_id: string }[] = [];
  let offset = 0;

  while (true) {
    const { data: batch } = await supabase
      .from("performance")
      .select("player_id")
      .range(offset, offset + 999);

    if (!batch || batch.length === 0) break;
    allPerf.push(...batch);
    offset += 1000;
  }

  const playerIdsWithPerformance = new Set(
    allPerf.map((p) => p.player_id)
  );

  // Find players without performance data (NFL players)
  const nflPlayers = allPlayers.filter(
    (p) => !playerIdsWithPerformance.has(p.id)
  );

  console.log(`Total players in database: ${allPlayers.length}`);
  console.log(`Players with performance data: ${playerIdsWithPerformance.size}`);
  console.log(`NFL players to remove: ${nflPlayers.length}\n`);

  if (nflPlayers.length === 0) {
    console.log("No NFL players to remove!");
    return;
  }

  console.log("NFL players being removed:");
  nflPlayers.forEach((p) => console.log(`  - ${p.display_name}`));

  // Delete prices for NFL players first (foreign key constraint)
  const nflPlayerIds = nflPlayers.map((p) => p.id);

  console.log("\nDeleting price records for NFL players...");
  const { error: pricesError } = await supabase
    .from("prices")
    .delete()
    .in("player_id", nflPlayerIds);

  if (pricesError) {
    console.error(`Error deleting prices: ${pricesError.message}`);
    return;
  }

  // Delete NFL players
  console.log("Deleting NFL players...");
  const { error: playersError } = await supabase
    .from("players")
    .delete()
    .in("id", nflPlayerIds);

  if (playersError) {
    console.error(`Error deleting players: ${playersError.message}`);
    return;
  }

  console.log(`\nDone! Removed ${nflPlayers.length} NFL players.`);

  // Verify
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true });

  console.log(`Remaining players in database: ${count}`);
}

main().catch(console.error);
