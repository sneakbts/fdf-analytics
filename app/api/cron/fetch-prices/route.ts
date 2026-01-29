import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { fetchAllTeneroTokens } from "@/lib/tenero";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow requests from Vercel cron or with valid secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if this is a Vercel cron request
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const supabase = getServiceSupabase();

    // Fetch all tokens from Tenero
    console.log("Fetching tokens from Tenero...");
    const tokens = await fetchAllTeneroTokens();
    console.log(`Fetched ${tokens.length} tokens`);

    // Get all players with token addresses
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, display_name, token_address");

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    if (!players || players.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No players to update",
        count: 0,
      });
    }

    // Match tokens to players and insert prices
    const pricesToInsert = [];

    for (const player of players) {
      if (!player.token_address) continue;

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
      const { error: insertError } = await supabase
        .from("prices")
        .insert(pricesToInsert);

      if (insertError) {
        throw new Error(`Failed to insert prices: ${insertError.message}`);
      }
    }

    console.log(`Inserted ${pricesToInsert.length} price records`);

    return NextResponse.json({
      success: true,
      message: `Updated prices for ${pricesToInsert.length} players`,
      count: pricesToInsert.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
