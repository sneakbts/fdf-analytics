/**
 * Reset database and re-import from Tenero with correct names.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TeneroToken {
  address: string;
  symbol: string;
  name: string;
  price_usd: number;
  marketcap_usd: number;
  holder_count: number;
}

async function fetchAllTeneroTokens(): Promise<TeneroToken[]> {
  const allTokens: TeneroToken[] = [];
  let cursor: string | null = null;

  console.log("Fetching tokens from Tenero API...");

  while (true) {
    const url: string = cursor
      ? `https://api.tenero.io/v1/sportsfun/tokens?cursor=${cursor}`
      : "https://api.tenero.io/v1/sportsfun/tokens";

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenero API error: ${response.status}`);
    }

    const data = await response.json();
    const tokens = data.data?.rows || [];

    const playerTokens = tokens.filter(
      (t: TeneroToken) => t.symbol !== "USDC" && t.name
    );

    allTokens.push(...playerTokens);
    console.log(`  Fetched ${tokens.length} tokens (total: ${allTokens.length})`);

    cursor = data.data?.next;
    if (!cursor) break;
  }

  return allTokens;
}

async function main() {
  console.log("=== Resetting database ===\n");

  // Delete all data
  console.log("Deleting performance records...");
  await supabase.from("performance").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Deleting price records...");
  await supabase.from("prices").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Deleting players...");
  await supabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("\n=== Re-importing from Tenero ===\n");

  const tokens = await fetchAllTeneroTokens();
  console.log(`\nFetched ${tokens.length} tokens total\n`);

  let created = 0;
  for (const token of tokens) {
    const { error } = await supabase.from("players").insert({
      display_name: token.name,
      token_symbol: token.symbol,
      token_address: token.address,
    });

    if (error) {
      console.error(`Failed to create ${token.name}:`, error.message);
    } else {
      created++;
    }
  }

  console.log(`Created ${created} players`);

  // Insert initial prices
  console.log("\nInserting initial prices...");
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, token_address")
    .not("token_address", "is", null);

  const pricesToInsert = [];
  for (const player of allPlayers || []) {
    const token = tokens.find(
      (t) => t.address.toLowerCase() === player.token_address.toLowerCase()
    );
    if (token) {
      pricesToInsert.push({
        player_id: player.id,
        price_usd: token.price_usd,
        marketcap_usd: token.marketcap_usd,
        holder_count: token.holder_count,
      });
    }
  }

  if (pricesToInsert.length > 0) {
    const { error } = await supabase.from("prices").insert(pricesToInsert);
    if (error) {
      console.error("Failed to insert prices:", error.message);
    } else {
      console.log(`Inserted ${pricesToInsert.length} price records`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
