/**
 * Fetch tournament data from pro.sport.fun API and insert into Supabase
 *
 * Usage:
 *   1. Log into pro.sport.fun in your browser
 *   2. Open DevTools > Application > Local Storage > pro.sport.fun
 *   3. Copy the "identity_token" value
 *   4. Run: SPORT_TOKEN="your_token_here" npm run fetch-tournament-data
 *
 * Or for a specific tournament:
 *   SPORT_TOKEN="..." TOURNAMENT_ID="c5b07d6d-..." npm run fetch-tournament-data
 */

const { createClient } = require('@supabase/supabase-js');

// Config
const SPORT_API_BASE = 'https://pro.sport.fun/api/football/v1';
const POSITIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

// Manual name mappings for players whose API names don't match DB names
// Format: { "API knownName": "DB display_name" }
const NAME_MAPPINGS = {
  // Add mappings here as needed, e.g.:
  // "Rodri": "Rodrigo Hernández",
};

// Get environment variables
const SPORT_TOKEN = process.env.SPORT_TOKEN;
const TOURNAMENT_ID = process.env.TOURNAMENT_ID; // Optional: specific tournament
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

// Fetch all players from API
async function fetchAPIPlayers() {
  console.log('📥 Fetching players from API...');
  const players = await sportFetch('/players/?limit=2000');
  console.log(`   Found ${players.length} players in API`);
  return players;
}

// Fetch all players from database
async function fetchDBPlayers() {
  console.log('📥 Fetching players from database...');
  const { data: players } = await supabase
    .from('players')
    .select('id, display_name');

  console.log(`   Found ${players.length} players in database`);
  return players;
}

// Create a mapping from API player ID to DB player ID
function createPlayerMapping(apiPlayers, dbPlayers) {
  console.log('🔗 Matching API players to database players...');

  // Create a map of lowercase DB names to DB player records
  const dbByName = new Map();
  dbPlayers.forEach(p => {
    dbByName.set(p.display_name.toLowerCase().trim(), p);
  });

  const mapping = new Map(); // API player ID -> DB player ID
  const unmatched = []; // API players we couldn't match

  for (const apiPlayer of apiPlayers) {
    const apiName = apiPlayer.knownName || `${apiPlayer.firstName} ${apiPlayer.lastName}`;

    // Check manual mapping first
    const mappedName = NAME_MAPPINGS[apiName];
    if (mappedName) {
      const dbPlayer = dbByName.get(mappedName.toLowerCase().trim());
      if (dbPlayer) {
        mapping.set(apiPlayer.id, dbPlayer.id);
        continue;
      }
    }

    // Try exact match (case-insensitive)
    const dbPlayer = dbByName.get(apiName.toLowerCase().trim());
    if (dbPlayer) {
      mapping.set(apiPlayer.id, dbPlayer.id);
    } else {
      unmatched.push({
        apiId: apiPlayer.id,
        apiName: apiName,
        position: apiPlayer.position,
        team: apiPlayer.team?.name,
      });
    }
  }

  console.log(`   ✅ Matched ${mapping.size} players`);

  return { mapping, unmatched };
}

// Fetch all tournaments
async function fetchTournaments() {
  console.log('📥 Fetching tournaments...');
  const tournaments = await sportFetch('/tournaments');
  console.log(`   Found ${tournaments.length} tournaments`);
  return tournaments;
}

// Fetch fixtures for a tournament and return the first fixture date
async function fetchFirstFixtureDate(tournamentId) {
  const fixtures = await sportFetch(`/tournaments/${tournamentId}/fixtures?limit=100`);

  if (!fixtures || fixtures.length === 0) {
    return null;
  }

  // Sort by date and get the first one
  fixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = fixtures[0].date.split('T')[0];

  return firstDate;
}

// Check if tournament data already exists in database
async function tournamentExists(matchDate) {
  const { count } = await supabase
    .from('performance')
    .select('*', { count: 'exact', head: true })
    .eq('match_date', matchDate);

  return count > 0;
}

// Fetch standings for a position
async function fetchStandings(tournamentId, position) {
  const standings = await sportFetch(`/tournaments/${tournamentId}/standings/${position}?limit=100`);
  return standings;
}

// Main function
async function main() {
  console.log('🏆 Sport.fun Tournament Data Fetcher\n');

  try {
    // Fetch players from both sources
    const apiPlayers = await fetchAPIPlayers();
    const dbPlayers = await fetchDBPlayers();

    // Create player ID mapping
    const { mapping: playerMapping, unmatched } = createPlayerMapping(apiPlayers, dbPlayers);

    // Report unmatched players
    if (unmatched.length > 0) {
      console.log(`\n⚠️  ${unmatched.length} API players could not be matched to database:`);
      unmatched.forEach(p => {
        console.log(`   - "${p.apiName}" (${p.position}, ${p.team})`);
      });
      console.log('\n   Add mappings to NAME_MAPPINGS in the script if these players should be included.\n');
    }

    // Fetch tournaments
    const tournaments = await fetchTournaments();

    // Filter to completed tournaments only
    let tournamentsToProcess;
    if (TOURNAMENT_ID) {
      tournamentsToProcess = tournaments.filter(t => t.id === TOURNAMENT_ID);
      if (tournamentsToProcess.length === 0) {
        console.error(`❌ Tournament ${TOURNAMENT_ID} not found`);
        process.exit(1);
      }
    } else {
      // Only fully completed tournaments
      tournamentsToProcess = tournaments.filter(t =>
        t.status === 'Completed' && t.fixturesRemaining === 0
      );
    }

    console.log(`\n📊 Found ${tournamentsToProcess.length} completed tournaments to check...\n`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let tournamentsSkipped = 0;

    for (const tournament of tournamentsToProcess) {
      const tournamentLabel = `${tournament.startDate.split('T')[0]} to ${tournament.endDate.split('T')[0]}`;

      // Get the first fixture date for this tournament
      const firstFixtureDate = await fetchFirstFixtureDate(tournament.id);

      if (!firstFixtureDate) {
        console.log(`⏭️  Tournament ${tournamentLabel}: No fixtures found, skipping`);
        tournamentsSkipped++;
        continue;
      }

      // Check if this tournament already exists in database
      const exists = await tournamentExists(firstFixtureDate);
      if (exists) {
        console.log(`⏭️  Tournament ${tournamentLabel} (${firstFixtureDate}): Already in database, skipping`);
        tournamentsSkipped++;
        continue;
      }

      console.log(`\n🏆 Tournament: ${tournamentLabel}`);
      console.log(`   ID: ${tournament.id}`);
      console.log(`   First fixture date: ${firstFixtureDate}`);
      console.log(`   Prize Pool: ${tournament.prizePool.toLocaleString()} TP`);

      // Collect all standings data
      const records = [];
      const unmatchedInTournament = [];

      for (const position of POSITIONS) {
        process.stdout.write(`   📥 Fetching ${position} standings... `);
        const standings = await fetchStandings(tournament.id, position);
        console.log(`${standings.length} entries`);

        for (const standing of standings) {
          const dbPlayerId = playerMapping.get(standing.playerId);

          if (!dbPlayerId) {
            // Find the unmatched player info
            const unmatchedPlayer = unmatched.find(u => u.apiId === standing.playerId);
            if (unmatchedPlayer && !unmatchedInTournament.find(u => u.apiId === standing.playerId)) {
              unmatchedInTournament.push(unmatchedPlayer);
            }
            continue;
          }

          records.push({
            player_id: dbPlayerId,
            match_date: firstFixtureDate, // All records get the first fixture date
            raw_score: Math.round(standing.rawScore),
            ranking: standing.ranking,
            reward: standing.reward || 0,
          });
        }
      }

      if (unmatchedInTournament.length > 0) {
        console.log(`   ⚠️  Skipped ${unmatchedInTournament.length} unmatched players in this tournament`);
      }

      if (records.length > 0) {
        console.log(`   💾 Inserting ${records.length} records...`);

        // Insert in batches of 100
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100);
          const { error } = await supabase
            .from('performance')
            .insert(batch);

          if (error) {
            console.error(`   ❌ Error inserting batch: ${error.message}`);
          }
        }

        totalInserted += records.length;
        console.log(`   ✅ Inserted ${records.length} records`);
      } else {
        console.log(`   ⚠️  No records to insert (all players unmatched?)`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Done!`);
    console.log(`   Tournaments processed: ${tournamentsToProcess.length - tournamentsSkipped}`);
    console.log(`   Tournaments skipped (already imported): ${tournamentsSkipped}`);
    console.log(`   Records inserted: ${totalInserted}`);

    if (unmatched.length > 0) {
      console.log(`\n⚠️  Remember: ${unmatched.length} players couldn't be matched.`);
      console.log('   Review the list above and add mappings if needed.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
