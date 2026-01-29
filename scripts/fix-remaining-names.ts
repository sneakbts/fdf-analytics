/**
 * Fix remaining player names that don't auto-match.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Manual mappings: Excel name → Tenero full name
const manualMappings: Record<string, string> = {
  "Pedri": "Pedro González López",
  "Raphinha": "Raphael Dias Belloli",
  "Vitinha": "Vítor Machado Ferreira",
};

async function main() {
  console.log("Fixing remaining player names...\n");

  for (const [excelName, teneroName] of Object.entries(manualMappings)) {
    const { data: player } = await supabase
      .from("players")
      .select("id, display_name")
      .eq("display_name", teneroName)
      .single();

    if (player) {
      const { error } = await supabase
        .from("players")
        .update({ display_name: excelName })
        .eq("id", player.id);

      if (error) {
        console.log(`  Error updating ${teneroName}: ${error.message}`);
      } else {
        console.log(`  "${teneroName}" → "${excelName}"`);
      }
    } else {
      console.log(`  Player not found: ${teneroName}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
