/**
 * Analyze player value for World Cup 2026
 *
 * Queries the database and identifies best buys based on:
 * - Historical performance (TP, rankings, consistency)
 * - Current price and market cap
 * - Value metrics (TP per dollar, etc.)
 *
 * Usage: npm run analyze-world-cup
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

// World Cup likely players by country (Premier League players)
const WORLD_CUP_PLAYERS = {
  'England': [
    'Bukayo Saka', 'Declan Rice', 'Cole Palmer', 'Phil Foden', 'John Stones',
    'Marc Guehi', 'Jarrod Bowen', 'Ollie Watkins', 'Eberechi Eze', 'Jordan Pickford',
    'Trent Alexander-Arnold', 'Kyle Walker', 'Harry Maguire', 'Conor Gallagher',
    'Morgan Gibbs-White', 'Levi Colwill', 'Rico Lewis', 'Angel Gomes', 'Noni Madueke'
  ],
  'France': [
    'William Saliba', 'Ibrahima Konaté', 'Jean-Philippe Mateta'
  ],
  'Netherlands': [
    'Virgil van Dijk', 'Cody Gakpo', 'Ryan Gravenberch', 'Micky van de Ven',
    'Jurrien Timber'
  ],
  'Brazil': [
    'Alisson', 'Ederson', 'Gabriel Magalhães', 'Bruno Guimarães', 'Lucas Paquetá',
    'Richarlison', 'Joao Pedro', 'Matheus Cunha', 'Danilo', 'Igor Thiago',
    'Murillo', 'Carlos Forbs', 'Vitor Reis', 'Savinho'
  ],
  'Argentina': [
    'Emiliano Martínez', 'Cristian Romero', 'Lisandro Martínez',
    'Alexis Mac Allister', 'Enzo Fernández'
  ],
  'Portugal': [
    'Rúben Dias', 'Bruno Fernandes', 'Bernardo Silva', 'Diogo Jota',
    'Pedro Neto', 'Diogo Dalot', 'Matheus Nunes', 'Nélson Semedo',
    'Gonçalo Guedes', 'João Palhinha'
  ],
  'Germany': [
    'Kai Havertz', 'Florian Wirtz', 'Niclas Füllkrug', 'Pascal Groß'
  ],
  'Spain': [
    'David Raya', 'Rodri', 'Mikel Merino', 'Martín Zubimendi'
  ],
  'Belgium': [
    'Leandro Trossard', 'Jérémy Doku', 'Amadou Onana', 'Youri Tielemans',
    'Timothy Castagne', 'Matz Sels'
  ],
  'Croatia': [
    'Joško Gvardiol', 'Mateo Kovačić'
  ],
  'Scotland': [
    'Andy Robertson', 'John McGinn', 'Scott McTominay'
  ],
  'Ghana': [
    'Thomas Partey', 'Mohammed Kudus', 'Antoine Semenyo'
  ],
  'Ivory Coast': [
    'Simon Adingra', 'Odilon Kossounou'
  ],
  'Morocco': [
    'Sofyan Amrabat', 'Noussair Mazraoui'
  ],
  'Senegal': [
    'Ismaïla Sarr', 'Nicolas Jackson', 'Edouard Mendy'
  ],
  'Nigeria': [
    'Wilfred Ndidi', 'Alex Iwobi', 'Calvin Bassey', 'Taiwo Awoniyi'
  ],
  'Japan': [
    'Kaoru Mitoma'
  ],
  'South Korea': [
    'Son Heung-min', 'Hwang Hee-chan'
  ],
  'Ukraine': [
    'Mykhailo Mudryk', 'Oleksandr Zinchenko', 'Illia Zabarnyi'
  ],
  'Ecuador': [
    'Moisés Caicedo', 'Pervis Estupiñán'
  ],
  'Colombia': [
    'Luis Díaz', 'Jhon Durán', 'Jefferson Lerma'
  ]
};

// Flatten to single list with country info
const allWorldCupPlayers = [];
for (const [country, players] of Object.entries(WORLD_CUP_PLAYERS)) {
  for (const name of players) {
    allWorldCupPlayers.push({ name: name.toLowerCase(), country });
  }
}

async function main() {
  console.log('🏆 World Cup 2026 Value Analysis\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Fetch all players
    console.log('📥 Fetching players...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*');

    if (playersError) throw playersError;
    console.log(`   Found ${players.length} players in database\n`);

    // Fetch all performance data
    console.log('📥 Fetching performance history...');
    const { data: performances, error: perfError } = await supabase
      .from('performance')
      .select('*')
      .order('match_date', { ascending: false });

    if (perfError) throw perfError;
    console.log(`   Found ${performances.length} performance records\n`);

    // Fetch latest prices
    console.log('📥 Fetching latest prices...');
    const playerIds = players.map(p => p.id);
    const { data: prices, error: pricesError } = await supabase
      .from('prices')
      .select('player_id, price_usd, marketcap_usd, holder_count, fetched_at')
      .in('player_id', playerIds)
      .order('fetched_at', { ascending: false });

    if (pricesError) throw pricesError;

    // Get latest price per player
    const latestPrices = new Map();
    for (const price of prices) {
      if (!latestPrices.has(price.player_id)) {
        latestPrices.set(price.player_id, price);
      }
    }
    console.log(`   Found prices for ${latestPrices.size} players\n`);

    // Calculate metrics for each player
    console.log('📊 Calculating player metrics...\n');

    const playerAnalysis = [];

    for (const player of players) {
      // Check if likely World Cup player
      const wcInfo = allWorldCupPlayers.find(
        wc => player.display_name.toLowerCase().includes(wc.name) ||
              wc.name.includes(player.display_name.toLowerCase())
      );

      // Get performance data for this player
      const playerPerf = performances.filter(p => p.player_id === player.id);
      const latestPrice = latestPrices.get(player.id);

      if (playerPerf.length === 0) continue;

      // Calculate performance metrics
      const totalTP = playerPerf.reduce((sum, p) => sum + (p.reward || 0), 0);
      const gamesPlayed = playerPerf.length;
      const gamesWithTP = playerPerf.filter(p => (p.reward || 0) > 0).length;
      const tpRate = (gamesWithTP / gamesPlayed) * 100;
      const avgScore = playerPerf.reduce((sum, p) => sum + (p.raw_score || 0), 0) / gamesPlayed;
      const avgRanking = playerPerf.reduce((sum, p) => sum + (p.ranking || 0), 0) / gamesPlayed;
      const bestRanking = Math.min(...playerPerf.map(p => p.ranking || 999));

      // Recent form (last 3 tournaments)
      const recentPerf = playerPerf.slice(0, 3);
      const recentTP = recentPerf.reduce((sum, p) => sum + (p.reward || 0), 0);
      const recentAvgScore = recentPerf.reduce((sum, p) => sum + (p.raw_score || 0), 0) / recentPerf.length;

      // Price metrics
      const priceUsd = latestPrice ? parseFloat(latestPrice.price_usd) : null;
      const marketCap = latestPrice ? parseFloat(latestPrice.marketcap_usd) : null;
      const holders = latestPrice ? latestPrice.holder_count : null;

      // Value metric: TP per dollar spent (higher = better value)
      const tpPerDollar = priceUsd && priceUsd > 0 ? totalTP / priceUsd : null;

      // Efficiency: avg score relative to price
      const scorePerDollar = priceUsd && priceUsd > 0 ? avgScore / priceUsd : null;

      playerAnalysis.push({
        id: player.id,
        name: player.display_name,
        team: player.team_name,
        position: player.position,
        country: wcInfo?.country || null,
        isWorldCupPlayer: !!wcInfo,
        // Performance
        totalTP,
        gamesPlayed,
        tpRate: Math.round(tpRate * 10) / 10,
        avgScore: Math.round(avgScore * 10) / 10,
        avgRanking: Math.round(avgRanking * 10) / 10,
        bestRanking,
        recentTP,
        recentAvgScore: Math.round(recentAvgScore * 10) / 10,
        // Price
        priceUsd,
        marketCap,
        holders,
        // Value
        tpPerDollar: tpPerDollar ? Math.round(tpPerDollar * 100) / 100 : null,
        scorePerDollar,
        // Active shares
        activeShares: player.active_shares,
        circulatingShares: player.circulating_shares,
      });
    }

    // Filter to World Cup players only
    const wcPlayers = playerAnalysis.filter(p => p.isWorldCupPlayer);

    console.log(`🌍 Found ${wcPlayers.length} World Cup players in your database\n`);
    console.log('='.repeat(60) + '\n');

    // Sort by different criteria and show top picks

    // 1. BEST VALUE (TP per Dollar)
    console.log('💰 BEST VALUE (Highest TP per Dollar Invested)');
    console.log('-'.repeat(60));
    const byValue = [...wcPlayers]
      .filter(p => p.tpPerDollar !== null && p.gamesPlayed >= 2)
      .sort((a, b) => b.tpPerDollar - a.tpPerDollar)
      .slice(0, 10);

    for (const p of byValue) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    Position: ${p.position || 'N/A'} | Team: ${p.team || 'N/A'}`);
      console.log(`    Price: $${p.priceUsd?.toFixed(4)} | TP/Dollar: ${p.tpPerDollar}`);
      console.log(`    Total TP: ${p.totalTP} | Games: ${p.gamesPlayed} | TP Rate: ${p.tpRate}%`);
      console.log(`    Avg Score: ${p.avgScore} | Best Rank: ${p.bestRanking}`);
      console.log();
    }

    // 2. MOST CONSISTENT (Highest TP Rate)
    console.log('\n📈 MOST CONSISTENT (Highest TP Rate, min 3 games)');
    console.log('-'.repeat(60));
    const byConsistency = [...wcPlayers]
      .filter(p => p.gamesPlayed >= 3)
      .sort((a, b) => b.tpRate - a.tpRate)
      .slice(0, 10);

    for (const p of byConsistency) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    TP Rate: ${p.tpRate}% | Games: ${p.gamesPlayed} | Total TP: ${p.totalTP}`);
      console.log(`    Price: $${p.priceUsd?.toFixed(4) || 'N/A'} | Avg Rank: ${p.avgRanking}`);
      console.log();
    }

    // 3. TOP SCORERS (Highest Average Score)
    console.log('\n⚽ TOP SCORERS (Highest Average Raw Score)');
    console.log('-'.repeat(60));
    const byScore = [...wcPlayers]
      .filter(p => p.gamesPlayed >= 2)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    for (const p of byScore) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    Avg Score: ${p.avgScore} | Best Rank: ${p.bestRanking} | Games: ${p.gamesPlayed}`);
      console.log(`    Price: $${p.priceUsd?.toFixed(4) || 'N/A'} | Total TP: ${p.totalTP}`);
      console.log();
    }

    // 4. HOT FORM (Best Recent Performance)
    console.log('\n🔥 HOT FORM (Best Recent 3-Game Performance)');
    console.log('-'.repeat(60));
    const byRecentForm = [...wcPlayers]
      .filter(p => p.gamesPlayed >= 3)
      .sort((a, b) => b.recentAvgScore - a.recentAvgScore)
      .slice(0, 10);

    for (const p of byRecentForm) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    Recent Avg Score: ${p.recentAvgScore} | Recent TP: ${p.recentTP}`);
      console.log(`    Overall Avg: ${p.avgScore} | Price: $${p.priceUsd?.toFixed(4) || 'N/A'}`);
      console.log();
    }

    // 5. BARGAIN BUYS (Low Price, Good Performance)
    console.log('\n🏷️  BARGAIN BUYS (Under $0.10 with Good Stats)');
    console.log('-'.repeat(60));
    const bargains = [...wcPlayers]
      .filter(p => p.priceUsd !== null && p.priceUsd < 0.10 && p.gamesPlayed >= 2 && p.avgScore > 50)
      .sort((a, b) => b.tpPerDollar - a.tpPerDollar)
      .slice(0, 10);

    for (const p of bargains) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    Price: $${p.priceUsd?.toFixed(4)} | TP/Dollar: ${p.tpPerDollar}`);
      console.log(`    Avg Score: ${p.avgScore} | Total TP: ${p.totalTP} | Games: ${p.gamesPlayed}`);
      console.log();
    }

    // 6. PREMIUM PICKS (Expensive but Elite)
    console.log('\n👑 PREMIUM PICKS (Top Performers, Any Price)');
    console.log('-'.repeat(60));
    const premium = [...wcPlayers]
      .filter(p => p.gamesPlayed >= 3)
      .sort((a, b) => b.totalTP - a.totalTP)
      .slice(0, 10);

    for (const p of premium) {
      console.log(`  ${p.name} (${p.country})`);
      console.log(`    Total TP: ${p.totalTP} | TP Rate: ${p.tpRate}% | Games: ${p.gamesPlayed}`);
      console.log(`    Price: $${p.priceUsd?.toFixed(4) || 'N/A'} | Market Cap: $${p.marketCap?.toFixed(2) || 'N/A'}`);
      console.log();
    }

    // 7. BY COUNTRY
    console.log('\n🌐 TOP PLAYER BY COUNTRY');
    console.log('-'.repeat(60));
    const countries = [...new Set(wcPlayers.filter(p => p.country).map(p => p.country))];
    for (const country of countries.sort()) {
      const countryPlayers = wcPlayers
        .filter(p => p.country === country && p.gamesPlayed >= 2)
        .sort((a, b) => b.avgScore - a.avgScore);

      if (countryPlayers.length > 0) {
        const top = countryPlayers[0];
        console.log(`  ${country}: ${top.name}`);
        console.log(`    Avg Score: ${top.avgScore} | TP Rate: ${top.tpRate}% | Price: $${top.priceUsd?.toFixed(4) || 'N/A'}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(60));

    // Get my top 5 overall recommendations (balanced value + performance)
    const recommendations = [...wcPlayers]
      .filter(p => p.priceUsd !== null && p.gamesPlayed >= 3)
      .map(p => ({
        ...p,
        // Composite score: value + consistency + raw performance
        compositeScore: (p.tpPerDollar || 0) * 0.3 +
                       (p.tpRate / 10) * 0.3 +
                       (p.avgScore / 10) * 0.4
      }))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 5);

    console.log('\n🎯 TOP 5 RECOMMENDED BUYS (Balanced Score):');
    console.log();
    for (let i = 0; i < recommendations.length; i++) {
      const p = recommendations[i];
      console.log(`  ${i + 1}. ${p.name} (${p.country})`);
      console.log(`     ${p.position || 'N/A'} - ${p.team || 'N/A'}`);
      console.log(`     Price: $${p.priceUsd?.toFixed(4)} | Total TP: ${p.totalTP}`);
      console.log(`     Avg Score: ${p.avgScore} | TP Rate: ${p.tpRate}% | Games: ${p.gamesPlayed}`);
      console.log(`     TP/Dollar: ${p.tpPerDollar} | Best Rank: ${p.bestRanking}`);
      console.log();
    }

    // Export full data
    console.log('\n📁 Full data exported to: world-cup-analysis.json');
    const fs = require('fs');
    fs.writeFileSync(
      'world-cup-analysis.json',
      JSON.stringify(wcPlayers.sort((a, b) => b.avgScore - a.avgScore), null, 2)
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
