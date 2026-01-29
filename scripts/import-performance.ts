/**
 * Import performance data from Excel file into Supabase.
 * Usage: npx tsx scripts/import-performance.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function parseDate(dateStr: string): string | null {
  try {
    const parts = String(dateStr).split("/");
    if (parts.length === 3) {
      let [month, day, year] = parts;
      if (year.length === 2) year = "20" + year;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  } catch {}
  return null;
}

async function main() {
  console.log("Loading Excel file...");
  const workbook = XLSX.readFile("all scores.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  // Row 0 is header label, Row 1 has actual dates, data starts at Row 2
  const dates: { col: number; date: string }[] = [];
  const dateRow = data[1]; // Dates are in row 1
  for (let col = 4; col < dateRow.length; col++) {
    const parsed = parseDate(String(dateRow[col]));
    if (parsed) {
      dates.push({ col, date: parsed });
    }
  }
  console.log(`Found ${dates.length} date columns`);

  // Get existing players from database
  console.log("Fetching players from database...");
  const { data: playersData } = await supabase
    .from("players")
    .select("id, display_name");

  const players = new Map<string, string>();
  playersData?.forEach((p) => {
    players.set(normalizeName(p.display_name), p.id);
  });
  console.log(`Found ${players.size} players in database`);

  // Parse performance data
  const performanceRecords: any[] = [];
  let currentPlayer: string | null = null;
  let currentPlayerId: string | null = null;
  let rowData: Map<string, any> = new Map();

  const skippedPlayers = new Set<string>();
  const matchedPlayers = new Set<string>();

  for (let idx = 2; idx < data.length; idx++) { // Data starts at row 2
    const row = data[idx];

    const displayName = row[0];
    if (displayName && String(displayName).trim()) {
      // Save previous player's data
      if (currentPlayerId && rowData.size > 0) {
        for (const [date, metrics] of rowData) {
          if (metrics.raw_score || metrics.ranking || metrics.reward) {
            performanceRecords.push({
              player_id: currentPlayerId,
              match_date: date,
              ...metrics,
            });
          }
        }
      }

      currentPlayer = String(displayName).trim();
      const normalized = normalizeName(currentPlayer);
      currentPlayerId = players.get(normalized) || null;

      // Try partial matching
      if (!currentPlayerId) {
        for (const [dbName, dbId] of players) {
          if (normalized.includes(dbName) || dbName.includes(normalized)) {
            currentPlayerId = dbId;
            break;
          }
          const csvParts = new Set(normalized.split(" "));
          const dbParts = new Set(dbName.split(" "));
          const intersection = [...csvParts].filter((x) => dbParts.has(x));
          if (intersection.length >= 1 && csvParts.size <= 3) {
            currentPlayerId = dbId;
            break;
          }
        }
      }

      if (currentPlayerId) {
        matchedPlayers.add(currentPlayer);
      } else {
        skippedPlayers.add(currentPlayer);
      }

      rowData = new Map();
      for (const { date } of dates) {
        rowData.set(date, {});
      }
    }

    const metricType = row[3];
    if (!metricType) continue;

    const metric = String(metricType).trim().toLowerCase();

    if (currentPlayerId) {
      for (const { col, date } of dates) {
        const val = row[col];
        if (val !== undefined && val !== null && val !== "") {
          // Remove commas from numbers like "7,788"
          const cleanVal = String(val).replace(/,/g, "");
          const numVal = Number(cleanVal);
          if (!isNaN(numVal)) {
            const metrics = rowData.get(date) || {};
            if (metric === "raw score") {
              metrics.raw_score = Math.round(numVal * 100) / 100;
            } else if (metric === "ranking") {
              metrics.ranking = Math.round(numVal);
            } else if (metric === "reward") {
              metrics.reward = Math.round(numVal * 100) / 100;
            }
            rowData.set(date, metrics);
          }
        }
      }
    }
  }

  // Last player
  if (currentPlayerId && rowData.size > 0) {
    for (const [date, metrics] of rowData) {
      if (metrics.raw_score || metrics.ranking || metrics.reward) {
        performanceRecords.push({
          player_id: currentPlayerId,
          match_date: date,
          ...metrics,
        });
      }
    }
  }

  console.log(`\nMatched ${matchedPlayers.size} players`);
  console.log(`Skipped ${skippedPlayers.size} players (not in database)`);

  if (skippedPlayers.size > 0) {
    console.log("\nSkipped players (first 15):");
    const sorted = [...skippedPlayers].sort().slice(0, 15);
    sorted.forEach((name) => console.log(`  - ${name}`));
    if (skippedPlayers.size > 15) {
      console.log(`  ... and ${skippedPlayers.size - 15} more`);
    }
  }

  console.log(`\nTotal performance records to insert: ${performanceRecords.length}`);

  if (performanceRecords.length === 0) {
    console.log("No records to insert!");
    return;
  }

  // Insert in batches
  const batchSize = 200;
  let inserted = 0;

  for (let i = 0; i < performanceRecords.length; i += batchSize) {
    const batch = performanceRecords.slice(i, i + batchSize);
    const { error } = await supabase
      .from("performance")
      .upsert(batch, { onConflict: "player_id,match_date" });

    if (error) {
      console.error(`Error inserting batch: ${error.message}`);
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} performance records.`);
}

main().catch(console.error);
