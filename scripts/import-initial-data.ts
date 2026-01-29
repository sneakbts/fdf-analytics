/**
 * Initial data import script
 *
 * This script:
 * 1. Fetches all tokens from Tenero API
 * 2. Creates player records in Supabase
 * 3. Links players to their token addresses using name matching
 *
 * Usage: npm run import-data
 *
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE_KEY env var set
 * - NEXT_PUBLIC_SUPABASE_URL env var set
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Filter out USDC
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

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

async function main() {
  console.log("Starting import...\n");

  // Fetch all tokens
  const tokens = await fetchAllTeneroTokens();
  console.log(`\nFetched ${tokens.length} tokens total\n`);

  // Check existing players
  const { data: existingPlayers } = await supabase
    .from("players")
    .select("id, display_name, token_address");

  console.log(`Found ${existingPlayers?.length || 0} existing players in database\n`);

  // Create a map for quick lookup
  const existingByName = new Map(
    existingPlayers?.map((p) => [normalizeName(p.display_name), p]) || []
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const token of tokens) {
    const normalizedTokenName = normalizeName(token.name);

    // Check if player exists
    const existing = existingByName.get(normalizedTokenName);

    if (existing) {
      // Update token info if not set
      if (!existing.token_address) {
        const { error } = await supabase
          .from("players")
          .update({
            token_symbol: token.symbol,
            token_address: token.address,
          })
          .eq("id", existing.id);

        if (error) {
          console.error(`Failed to update ${token.name}:`, error.message);
        } else {
          console.log(`Updated: ${token.name} (${token.symbol})`);
          updated++;
        }
      } else {
        skipped++;
      }
    } else {
      // Create new player
      const { error } = await supabase.from("players").insert({
        display_name: token.name,
        token_symbol: token.symbol,
        token_address: token.address,
      });

      if (error) {
        console.error(`Failed to create ${token.name}:`, error.message);
      } else {
        console.log(`Created: ${token.name} (${token.symbol})`);
        created++;
      }
    }
  }

  console.log("\n--- Import Complete ---");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already linked): ${skipped}`);

  // Now fetch initial prices
  console.log("\nFetching initial prices...");

  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, display_name, token_address")
    .not("token_address", "is", null);

  if (!allPlayers || allPlayers.length === 0) {
    console.log("No players with token addresses to fetch prices for");
    return;
  }

  const pricesToInsert = [];

  for (const player of allPlayers) {
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
      console.log(`Inserted ${pricesToInsert.length} initial price records`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
