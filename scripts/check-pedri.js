const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  // Find Pedri's player ID
  const { data: player } = await supabase
    .from('players')
    .select('id, display_name')
    .ilike('display_name', '%pedri%')
    .single();

  console.log('Player:', player);

  if (!player) return;

  // Get all performance records with rewards
  const { data: perf } = await supabase
    .from('performance')
    .select('match_date, reward, raw_score, ranking')
    .eq('player_id', player.id)
    .not('reward', 'is', null)
    .gt('reward', 0)
    .order('match_date', { ascending: true });

  console.log('\nPerformance records with TP:');
  console.log('Total records:', perf?.length);

  // Group by month
  const byMonth = {};
  perf?.forEach(p => {
    const month = p.match_date.substring(0, 7);
    if (!byMonth[month]) byMonth[month] = { count: 0, totalTP: 0 };
    byMonth[month].count++;
    byMonth[month].totalTP += p.reward;
  });

  console.log('\nTP by month:');
  Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).forEach(([month, data]) => {
    console.log(`${month}: ${data.totalTP.toLocaleString()} TP (${data.count} games)`);
  });
}

check();
