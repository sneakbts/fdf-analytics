/**
 * Update player display names to use shorter names from Excel sheet.
 * Uses strict matching to avoid false positives.
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z\s]/g, "") // Remove non-letters
    .trim();
}

// Check if shortName is a shortened version of fullName
function isShortVersion(shortName: string, fullName: string): boolean {
  const shortNorm = normalizeName(shortName);
  const fullNorm = normalizeName(fullName);

  // Exact match
  if (shortNorm === fullNorm) return true;

  // Short name is contained in full name (e.g., "Lamine Yamal" in "Lamine Yamal Nasraoui Ebana")
  if (fullNorm.includes(shortNorm)) return true;

  // Check if all parts of short name are in full name
  const shortParts = shortNorm.split(" ");
  const fullParts = fullNorm.split(" ");

  // All parts of short name must exist in full name
  const allPartsMatch = shortParts.every((part) =>
    fullParts.some((fp) => fp === part || fp.startsWith(part) || part.startsWith(fp))
  );

  // And the short name should have fewer or equal parts
  if (allPartsMatch && shortParts.length <= fullParts.length) {
    return true;
  }

  return false;
}

async function main() {
  console.log("Loading Excel file...");
  const workbook = XLSX.readFile("all scores.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  // Get player names from Excel
  const excelNames: { name: string; team: string; position: string }[] = [];
  for (let i = 2; i < data.length; i++) {
    const name = data[i][0];
    if (name && String(name).trim() && name !== "Display Name") {
      excelNames.push({
        name: String(name).trim(),
        team: String(data[i][1] || "").trim(),
        position: String(data[i][2] || "").trim(),
      });
    }
  }
  console.log(`Found ${excelNames.length} player names in Excel`);

  // Get all players from database
  console.log("Fetching players from database...");
  const { data: dbPlayers } = await supabase
    .from("players")
    .select("id, display_name, team_name, position");

  if (!dbPlayers) {
    console.log("No players in database");
    return;
  }
  console.log(`Found ${dbPlayers.length} players in database`);

  // Match and update
  const updates: { id: string; oldName: string; newName: string; team?: string; position?: string }[] = [];
  const usedDbPlayers = new Set<string>();

  for (const excel of excelNames) {
    for (const db of dbPlayers) {
      if (usedDbPlayers.has(db.id)) continue;

      // Only match if excel name is a shortened version of db name
      if (isShortVersion(excel.name, db.display_name)) {
        // Only update if names are actually different
        if (db.display_name !== excel.name) {
          updates.push({
            id: db.id,
            oldName: db.display_name,
            newName: excel.name,
            team: excel.team || undefined,
            position: excel.position || undefined,
          });
          usedDbPlayers.add(db.id);
        }
        break;
      }
    }
  }

  console.log(`\nFound ${updates.length} names to update:\n`);

  let updated = 0;
  for (const update of updates) {
    console.log(`  "${update.oldName}" → "${update.newName}"`);

    const updateData: any = { display_name: update.newName };
    if (update.team) updateData.team_name = update.team;
    if (update.position) updateData.position = update.position;

    const { error } = await supabase
      .from("players")
      .update(updateData)
      .eq("id", update.id);

    if (error) {
      console.error(`    Error: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\nDone! Updated ${updated} player names.`);
}

main().catch(console.error);
