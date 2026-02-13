/**
 * Verify player performance data - fetch ALL records
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Verifying Player Data\n');

  // Get all players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*');

  if (playersError) {
    console.error('Error fetching players:', playersError);
    return;
  }

  console.log(`Found ${players.length} players\n`);

  // Get ALL performance records (not just 1000)
  let allPerformances = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: performances, error: perfError } = await supabase
      .from('performance')
      .select('*')
      .range(offset, offset + pageSize - 1)
      .order('match_date', { ascending: false });

    if (perfError) {
      console.error('Error fetching performances:', perfError);
      break;
    }

    if (performances.length === 0) break;

    allPerformances = allPerformances.concat(performances);
    console.log(`Fetched ${allPerformances.length} performance records...`);

    if (performances.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`\n✅ Total performance records: ${allPerformances.length}\n`);

  // Get latest prices
  const playerIds = players.map(p => p.id);
  const { data: prices } = await supabase
    .from('prices')
    .select('player_id, price_usd, marketcap_usd, holder_count, fetched_at')
    .in('player_id', playerIds)
    .order('fetched_at', { ascending: false });

  const latestPrices = new Map();
  for (const price of prices) {
    if (!latestPrices.has(price.player_id)) {
      latestPrices.set(price.player_id, price);
    }
  }

  // Check specific players mentioned
  const playersToCheck = ['Declan Rice', 'Rúben Dias', 'Cristian Romero', 'Luis Díaz', 'Bruno Fernandes'];

  console.log('='.repeat(70));
  console.log('DETAILED PLAYER VERIFICATION');
  console.log('='.repeat(70));

  for (const playerName of playersToCheck) {
    const player = players.find(p => p.display_name === playerName);
    if (!player) {
      console.log(`\n❌ Player not found: ${playerName}`);
      continue;
    }

    const playerPerf = allPerformances.filter(p => p.player_id === player.id);
    const latestPrice = latestPrices.get(player.id);

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📊 ${playerName} (${player.position} - ${player.team_name})`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`Price: $${latestPrice ? parseFloat(latestPrice.price_usd).toFixed(4) : 'N/A'}`);
    console.log(`Games Played: ${playerPerf.length}`);

    if (playerPerf.length > 0) {
      const totalTP = playerPerf.reduce((sum, p) => sum + (p.reward || 0), 0);
      const gamesWithTP = playerPerf.filter(p => (p.reward || 0) > 0).length;
      const avgScore = playerPerf.reduce((sum, p) => sum + (p.raw_score || 0), 0) / playerPerf.length;
      const avgRanking = playerPerf.reduce((sum, p) => sum + (p.ranking || 0), 0) / playerPerf.length;
      const bestRanking = Math.min(...playerPerf.map(p => p.ranking || 999));

      console.log(`Total TP Earned: ${totalTP.toLocaleString()}`);
      console.log(`Games with TP: ${gamesWithTP} (${((gamesWithTP/playerPerf.length)*100).toFixed(1)}%)`);
      console.log(`Avg Score: ${avgScore.toFixed(1)}`);
      console.log(`Avg Ranking: ${avgRanking.toFixed(1)}`);
      console.log(`Best Ranking: ${bestRanking}`);

      console.log(`\nAll Performance Records:`);
      console.log(`${'Date'.padEnd(12)} ${'Score'.padEnd(8)} ${'Rank'.padEnd(6)} ${'Reward'.padEnd(12)}`);
      console.log(`${'-'.repeat(12)} ${'-'.repeat(8)} ${'-'.repeat(6)} ${'-'.repeat(12)}`);

      // Sort by date descending
      playerPerf.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

      for (const perf of playerPerf) {
        const date = perf.match_date;
        const score = (perf.raw_score || 0).toString().padEnd(8);
        const rank = (perf.ranking || '-').toString().padEnd(6);
        const reward = (perf.reward || 0).toLocaleString().padEnd(12);
        console.log(`${date} ${score} ${rank} ${reward}`);
      }
    }
  }

  // Now output corrected full analysis
  console.log('\n\n' + '='.repeat(70));
  console.log('CORRECTED FULL WORLD CUP PLAYER ANALYSIS');
  console.log('='.repeat(70));

  // World Cup players list (same as before)
  const WORLD_CUP_PLAYERS = {
    'England': [
      'Bukayo Saka', 'Declan Rice', 'Cole Palmer', 'Phil Foden', 'John Stones',
      'Marc Guehi', 'Jarrod Bowen', 'Ollie Watkins', 'Eberechi Eze', 'Jordan Pickford',
      'Trent Alexander-Arnold', 'Kyle Walker', 'Harry Maguire', 'Conor Gallagher',
      'Morgan Gibbs-White', 'Levi Colwill', 'Rico Lewis', 'Angel Gomes', 'Noni Madueke'
    ],
    'France': ['William Saliba', 'Ibrahima Konaté', 'Jean-Philippe Mateta'],
    'Netherlands': ['Virgil van Dijk', 'Cody Gakpo', 'Ryan Gravenberch', 'Micky van de Ven', 'Jurrien Timber'],
    'Brazil': [
      'Alisson Becker', 'Ederson', 'Gabriel Magalhães', 'Bruno Guimarães', 'Lucas Paquetá',
      'Richarlison', 'Joao Pedro', 'Matheus Cunha', 'Danilo', 'Igor Thiago',
      'Murillo', 'Carlos Forbs', 'Vitor Reis', 'Savinho'
    ],
    'Argentina': ['Emiliano Martínez', 'Cristian Romero', 'Lisandro Martínez', 'Alexis Mac Allister', 'Enzo Fernández'],
    'Portugal': ['Rúben Dias', 'Bruno Fernandes', 'Bernardo Silva', 'Diogo Jota', 'Pedro Neto', 'Diogo Dalot', 'Matheus Nunes', 'Nélson Semedo', 'Gonçalo Guedes', 'João Palhinha'],
    'Germany': ['Kai Havertz', 'Florian Wirtz', 'Niclas Füllkrug', 'Pascal Groß'],
    'Spain': ['David Raya', 'Rodri', 'Mikel Merino', 'Martín Zubimendi'],
    'Belgium': ['Leandro Trossard', 'Jérémy Doku', 'Amadou Onana', 'Youri Tielemans', 'Timothy Castagne', 'Matz Sels'],
    'Croatia': ['Joško Gvardiol', 'Mateo Kovačić'],
    'Scotland': ['Andy Robertson', 'John McGinn', 'Scott McTominay'],
    'Ghana': ['Thomas Partey', 'Mohammed Kudus', 'Antoine Semenyo'],
    'Ivory Coast': ['Simon Adingra', 'Odilon Kossounou'],
    'Morocco': ['Sofyan Amrabat', 'Noussair Mazraoui'],
    'Senegal': ['Ismaïla Sarr', 'Nicolas Jackson', 'Edouard Mendy'],
    'Nigeria': ['Wilfred Ndidi', 'Alex Iwobi', 'Calvin Bassey', 'Taiwo Awoniyi'],
    'Japan': ['Kaoru Mitoma'],
    'South Korea': ['Son Heung-min', 'Hwang Hee-chan'],
    'Ukraine': ['Mykhailo Mudryk', 'Oleksandr Zinchenko', 'Illia Zabarnyi'],
    'Ecuador': ['Moisés Caicedo', 'Pervis Estupiñán'],
    'Colombia': ['Luis Díaz', 'Jhon Durán', 'Jefferson Lerma']
  };

  const allWorldCupPlayers = [];
  for (const [country, playerList] of Object.entries(WORLD_CUP_PLAYERS)) {
    for (const name of playerList) {
      allWorldCupPlayers.push({ name: name.toLowerCase(), country });
    }
  }

  const playerAnalysis = [];

  for (const player of players) {
    const wcInfo = allWorldCupPlayers.find(
      wc => player.display_name.toLowerCase().includes(wc.name) ||
            wc.name.includes(player.display_name.toLowerCase())
    );

    if (!wcInfo) continue;

    const playerPerf = allPerformances.filter(p => p.player_id === player.id);
    const latestPrice = latestPrices.get(player.id);

    if (playerPerf.length === 0) continue;

    const totalTP = playerPerf.reduce((sum, p) => sum + (p.reward || 0), 0);
    const gamesPlayed = playerPerf.length;
    const gamesWithTP = playerPerf.filter(p => (p.reward || 0) > 0).length;
    const tpRate = (gamesWithTP / gamesPlayed) * 100;
    const avgScore = playerPerf.reduce((sum, p) => sum + (p.raw_score || 0), 0) / gamesPlayed;
    const avgRanking = playerPerf.reduce((sum, p) => sum + (p.ranking || 0), 0) / gamesPlayed;
    const bestRanking = Math.min(...playerPerf.map(p => p.ranking || 999));

    const recentPerf = playerPerf.slice(0, 3);
    const recentTP = recentPerf.reduce((sum, p) => sum + (p.reward || 0), 0);
    const recentAvgScore = recentPerf.reduce((sum, p) => sum + (p.raw_score || 0), 0) / recentPerf.length;

    const priceUsd = latestPrice ? parseFloat(latestPrice.price_usd) : null;
    const marketCap = latestPrice ? parseFloat(latestPrice.marketcap_usd) : null;
    const holders = latestPrice ? latestPrice.holder_count : null;

    const tpPerDollar = priceUsd && priceUsd > 0 ? totalTP / priceUsd : null;

    playerAnalysis.push({
      name: player.display_name,
      team: player.team_name,
      position: player.position,
      country: wcInfo.country,
      totalTP: Math.round(totalTP),
      gamesPlayed,
      gamesWithTP,
      tpRate: Math.round(tpRate * 10) / 10,
      avgScore: Math.round(avgScore * 10) / 10,
      avgRanking: Math.round(avgRanking * 10) / 10,
      bestRanking,
      recentTP: Math.round(recentTP),
      recentAvgScore: Math.round(recentAvgScore * 10) / 10,
      priceUsd,
      marketCap,
      holders,
      tpPerDollar: tpPerDollar ? Math.round(tpPerDollar) : null,
    });
  }

  // Sort by average score
  playerAnalysis.sort((a, b) => b.avgScore - a.avgScore);

  console.log(`\nFound ${playerAnalysis.length} World Cup players with performance data\n`);

  // Output as table
  console.log('Player'.padEnd(25) + 'Country'.padEnd(12) + 'Pos'.padEnd(5) + 'Price'.padEnd(10) + 'Games'.padEnd(7) + 'TP Games'.padEnd(10) + 'TP Rate'.padEnd(9) + 'Avg Score'.padEnd(11) + 'Total TP'.padEnd(12) + 'Best Rank');
  console.log('-'.repeat(120));

  for (const p of playerAnalysis) {
    console.log(
      p.name.substring(0, 24).padEnd(25) +
      p.country.substring(0, 11).padEnd(12) +
      (p.position || 'N/A').substring(0, 4).padEnd(5) +
      ('$' + (p.priceUsd?.toFixed(4) || 'N/A')).padEnd(10) +
      p.gamesPlayed.toString().padEnd(7) +
      p.gamesWithTP.toString().padEnd(10) +
      (p.tpRate + '%').padEnd(9) +
      p.avgScore.toString().padEnd(11) +
      p.totalTP.toLocaleString().padEnd(12) +
      p.bestRanking
    );
  }

  // Save corrected data
  const fs = require('fs');
  fs.writeFileSync(
    'world-cup-analysis-corrected.json',
    JSON.stringify(playerAnalysis, null, 2)
  );
  console.log('\n✅ Corrected data saved to world-cup-analysis-corrected.json');
}

main();
