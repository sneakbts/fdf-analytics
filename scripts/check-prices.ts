import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  console.log('--- Testing price join (same as leaderboard query) ---\n');

  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, position, prices (price_usd)')
    .not('position', 'is', null)
    .limit(10);

  console.log('Players with prices join:');
  players?.forEach(p => {
    const prices = p.prices as { price_usd: number }[] | null;
    const price = prices && prices.length > 0 ? prices[0].price_usd : 0;
    console.log(`${p.display_name}: ${prices?.length || 0} price records, first price: $${price}`);
  });

  // Also check total price records
  const { count } = await supabase
    .from('prices')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal price records in DB:', count);
}

check();
