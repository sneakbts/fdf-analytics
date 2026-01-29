const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  // Find Pedri and Harry Kane
  const { data: players } = await supabase
    .from('players')
    .select('id, display_name')
    .in('display_name', ['Pedri', 'Harry Kane']);

  console.log('Players:', players);

  for (const player of players || []) {
    console.log(`\n--- ${player.display_name} ---`);

    // Get last 10 performance records
    const { data: perf } = await supabase
      .from('performance')
      .select('match_date, raw_score, ranking, reward')
      .eq('player_id', player.id)
      .order('match_date', { ascending: false })
      .limit(10);

    console.log('Last 10 games (most recent first):');
    perf?.forEach((p, i) => {
      console.log(`${i + 1}. ${p.match_date}: Score=${p.raw_score}, Rank=${p.ranking}, TP=${p.reward}`);
    });
  }
}

check();
