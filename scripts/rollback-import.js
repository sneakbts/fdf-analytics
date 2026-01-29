const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function rollback() {
  console.log('🗑️  Rolling back imported data...\n');

  // Delete performance records from Jan 13, 2026 onwards (the 4 tournaments we imported)
  const { data: deletedPerf, error: perfError } = await supabase
    .from('performance')
    .delete()
    .gte('match_date', '2026-01-13')
    .select('id');

  if (perfError) {
    console.error('❌ Error deleting performance records:', perfError.message);
  } else {
    console.log('✅ Deleted', deletedPerf.length, 'performance records');
  }

  // Get all players and check which ones have no performance records
  const { data: playersToCheck } = await supabase
    .from('players')
    .select('id, display_name');

  let deletedCount = 0;
  for (const player of playersToCheck || []) {
    const { count } = await supabase
      .from('performance')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.id);

    // If player has no performance records left, they were added by the script
    if (count === 0) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id);

      if (!error) deletedCount++;
    }
  }

  console.log('✅ Deleted', deletedCount, 'players (who had no remaining performance records)');

  // Verify final counts
  const { count: playerCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  const { count: perfCount } = await supabase
    .from('performance')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Database now has:');
  console.log('   Players:', playerCount);
  console.log('   Performance records:', perfCount);
}

rollback();
