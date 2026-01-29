/**
 * Debug performance data to understand player_id distribution.
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
  // Get all performance records with pagination
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
    console.log(`Fetched ${allPerf.length} records...`);
  }

  const uniqueIds = new Set(allPerf.map((p) => p.player_id));
  console.log(`\nTotal performance records: ${allPerf.length}`);
  console.log(`Unique player_ids: ${uniqueIds.size}`);

  // Get players for those IDs
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name")
    .in("id", [...uniqueIds]);

  console.log(`\nPlayers with performance data:`);
  players?.sort((a, b) => a.display_name.localeCompare(b.display_name));
  players?.forEach((p) => console.log(`  - ${p.display_name}`));
}

main().catch(console.error);
