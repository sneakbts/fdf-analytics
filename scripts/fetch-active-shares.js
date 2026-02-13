/**
 * Fetch active and circulating shares from pro.sport.fun API and update players table
 *
 * Usage:
 *   1. Log into pro.sport.fun in your browser
 *   2. Open DevTools > Application > Local Storage > pro.sport.fun
 *   3. Copy the "identity_token" value
 *   4. Run: SPORT_TOKEN="your_token_here" npm run fetch-active-shares
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Config
const SPORT_API_BASE = 'https://pro.sport.fun/api/football/v1';

// Get environment variables
const SPORT_TOKEN = process.env.SPORT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SPORT_TOKEN) {
  console.error('❌ Missing SPORT_TOKEN environment variable');
  console.error('   Get it from: pro.sport.fun > DevTools > Application > Local Storage > identity_token');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to fetch from Sport API
async function sportFetch(endpoint) {
  const url = `${SPORT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SPORT_TOKEN}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  return json.data;
}

// Fetch single player details (includes activeShares)
async function fetchPlayerDetails(playerId) {
  return await sportFetch(`/players/${playerId}`);
}

// Main function
async function main() {
  console.log('📊 Active Shares Fetcher\n');

  try {
    // Get all players from database that have token addresses (active in the game)
    console.log('📥 Fetching players from database...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, display_name, token_address')
      .not('token_address', 'is', null);

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    console.log(`   Found ${players.length} players with token addresses\n`);

    // We need to map our DB players to sport.fun player IDs
    // Fetch all players from sport.fun API to create a mapping
    console.log('📥 Fetching players from sport.fun API...');
    const apiPlayers = await sportFetch('/players/?limit=2000');
    console.log(`   Found ${apiPlayers.length} players in API\n`);

    // Create mapping from display name to API player ID
    const apiPlayerByName = new Map();
    apiPlayers.forEach(p => {
      const name = p.knownName || `${p.firstName} ${p.lastName}`;
      apiPlayerByName.set(name.toLowerCase().trim(), p.id);
    });

    // Fetch active shares for each player
    console.log('📥 Fetching active shares for each player...');
    const priceRecords = [];
    let fetched = 0;
    let skipped = 0;
    let errors = 0;

    for (const player of players) {
      const apiPlayerId = apiPlayerByName.get(player.display_name.toLowerCase().trim());

      if (!apiPlayerId) {
        console.log(`   ⚠️  No API match for: ${player.display_name}`);
        skipped++;
        continue;
      }

      try {
        const details = await fetchPlayerDetails(apiPlayerId);

        if (details && details.globalShares) {
          const record = { player_id: player.id };
          if (details.globalShares.active !== undefined) {
            record.active_shares = Math.round(details.globalShares.active);
          }
          if (details.globalShares.circulating !== undefined) {
            record.circulating_shares = Math.round(details.globalShares.circulating);
          }
          priceRecords.push(record);
          fetched++;

          if (fetched % 20 === 0) {
            console.log(`   ✓ Fetched ${fetched} players...`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.log(`   ❌ Error fetching ${player.display_name}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fetched: ${fetched}`);
    console.log(`   Skipped (no API match): ${skipped}`);
    console.log(`   Errors: ${errors}`);

if (priceRecords.length > 0) {
      console.log(`\n💾 Updating ${priceRecords.length} player records...`);

      let updated = 0;
      for (const record of priceRecords) {
        const updateData = {};
        if (record.active_shares !== undefined) {
          updateData.active_shares = record.active_shares;
        }
        if (record.circulating_shares !== undefined) {
          updateData.circulating_shares = record.circulating_shares;
        }

        const { error } = await supabase
          .from('players')
          .update(updateData)
          .eq('id', record.player_id);

        if (error) {
          console.error(`   ❌ Error updating player: ${error.message}`);
        } else {
          updated++;
        }
      }

      console.log(`   ✅ Updated ${updated} players!`);
    } else {
      console.log('\n⚠️  No records to update');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
