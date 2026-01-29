/**
 * Update player teams and positions from Sports.fun data.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Team abbreviation to full name mapping
const TEAMS: Record<string, string> = {
  BAR: "Barcelona",
  RMA: "Real Madrid",
  FCB: "Bayern Munich",
  MCI: "Manchester City",
  PSG: "Paris Saint-Germain",
  MUN: "Manchester United",
  ARS: "Arsenal",
  LIV: "Liverpool",
  CHE: "Chelsea",
  BVB: "Borussia Dortmund",
  JUV: "Juventus",
  OM: "Olympique Marseille",
  TOT: "Tottenham",
  LEV: "Bayer Leverkusen",
  ATM: "Atlético Madrid",
  INT: "Inter Milan",
  MIL: "AC Milan",
  NAP: "Napoli",
  AVL: "Aston Villa",
  VFB: "VfB Stuttgart",
  ATH: "Athletic Bilbao",
  NFO: "Nottingham Forest",
  NEW: "Newcastle",
  EVE: "Everton",
  CRY: "Crystal Palace",
  BET: "Real Betis",
  ASM: "AS Monaco",
  ROM: "AS Roma",
  LAZ: "Lazio",
  SGE: "Eintracht Frankfurt",
  LEE: "Leeds United",
};

// Position abbreviation to full name
const POSITIONS: Record<string, string> = {
  FWD: "Forward",
  MID: "Midfielder",
  DEF: "Defender",
  GK: "Goalkeeper",
};

// Player data: [display_name, team_abbr, position_abbr]
const playerData: [string, string, string][] = [
  ["Lamine Yamal", "BAR", "FWD"],
  ["Kylian Mbappé", "RMA", "FWD"],
  ["Michael Olise", "FCB", "MID"],
  ["Harry Kane", "FCB", "FWD"],
  ["Erling Haaland", "MCI", "FWD"],
  ["Vitinha", "PSG", "MID"],
  ["Raphinha", "BAR", "FWD"],
  ["Pedri", "BAR", "MID"],
  ["Bruno Fernandes", "MUN", "MID"],
  ["Jude Bellingham", "RMA", "MID"],
  ["Joshua Kimmich", "FCB", "MID"],
  ["Ousmane Dembélé", "PSG", "FWD"],
  ["Gabriel Magalhães", "ARS", "DEF"],
  ["Vinícius Júnior", "RMA", "FWD"],
  ["Declan Rice", "ARS", "MID"],
  ["Florian Wirtz", "LIV", "MID"],
  ["Luis Díaz", "FCB", "FWD"],
  ["Jonathan Tah", "FCB", "DEF"],
  ["Dean Huijsen", "RMA", "DEF"],
  ["Nico Schlotterbeck", "BVB", "DEF"],
  ["Bukayo Saka", "ARS", "FWD"],
  ["Kenan Yildiz", "JUV", "FWD"],
  ["Rayan Cherki", "MCI", "MID"],
  ["Achraf Hakimi", "PSG", "DEF"],
  ["Cole Palmer", "CHE", "MID"],
  ["Marc Guéhi", "MCI", "DEF"],
  ["Mason Greenwood", "OM", "FWD"],
  ["Virgil van Dijk", "LIV", "DEF"],
  ["Dani Olmo", "BAR", "MID"],
  ["Jules Koundé", "BAR", "DEF"],
  ["Désiré Doué", "PSG", "FWD"],
  ["Nuno Mendes", "PSG", "DEF"],
  ["Joan García", "BAR", "GK"],
  ["Rúben Dias", "MCI", "DEF"],
  ["William Saliba", "ARS", "DEF"],
  ["Hugo Ekitiké", "LIV", "FWD"],
  ["David Raya", "ARS", "GK"],
  ["Rodri", "MCI", "MID"],
  ["Phil Foden", "MCI", "MID"],
  ["Enzo Fernández", "CHE", "MID"],
  ["Pau Cubarsí", "BAR", "DEF"],
  ["Moisés Caicedo", "CHE", "MID"],
  ["Martin Ødegaard", "ARS", "MID"],
  ["Alisson Becker", "LIV", "GK"],
  ["Federico Valverde", "RMA", "MID"],
  ["Mike Maignan", "MIL", "GK"],
  ["Jérémy Doku", "MCI", "FWD"],
  ["Marc Cucurella", "CHE", "DEF"],
  ["Julián Alvarez", "ATM", "FWD"],
  ["Cristian Romero", "TOT", "DEF"],
  ["Dayot Upamecano", "FCB", "DEF"],
  ["Alejandro Grimaldo", "LEV", "DEF"],
  ["Manuel Locatelli", "JUV", "MID"],
  ["Matheus Cunha", "MUN", "FWD"],
  ["Alessandro Bastoni", "INT", "DEF"],
  ["Mohamed Salah", "LIV", "FWD"],
  ["Unai Simón", "ATH", "GK"],
  ["Gianluigi Donnarumma", "MCI", "GK"],
  ["Ezri Konsa", "AVL", "DEF"],
  ["Emiliano Martínez", "AVL", "GK"],
  ["Maximilian Mittelstädt", "VFB", "DEF"],
  ["Thibaut Courtois", "RMA", "GK"],
  ["João Pedro", "CHE", "FWD"],
  ["João Neves", "PSG", "MID"],
  ["Hakan Çalhanoglu", "INT", "MID"],
  ["Christian Pulisic", "MIL", "MID"],
  ["Scott McTominay", "NAP", "MID"],
  ["Robert Sánchez", "CHE", "GK"],
  ["Lautaro Martínez", "INT", "FWD"],
  ["Bryan Mbeumo", "MUN", "FWD"],
  ["Amir Rrahmani", "NAP", "DEF"],
  ["Jurriën Timber", "ARS", "DEF"],
  ["Gregor Kobel", "BVB", "GK"],
  ["Guglielmo Vicario", "TOT", "GK"],
  ["Ryan Gravenberch", "LIV", "MID"],
  ["Jordan Pickford", "EVE", "GK"],
  ["Pedro Neto", "CHE", "FWD"],
  ["Fabián Ruiz", "PSG", "MID"],
  ["Pedro Porro", "TOT", "DEF"],
  ["Milos Kerkez", "LIV", "DEF"],
  ["Trent Alexander-Arnold", "RMA", "DEF"],
  ["Arda Güler", "RMA", "MID"],
  ["Rafael Leão", "MIL", "FWD"],
  ["Elliot Anderson", "NFO", "MID"],
  ["Morgan Gibbs-White", "NFO", "MID"],
  ["Álvaro Carreras", "RMA", "DEF"],
  ["Josko Gvardiol", "MCI", "DEF"],
  ["Giovanni Di Lorenzo", "NAP", "DEF"],
  ["Antony", "BET", "FWD"],
  ["Khvicha Kvaratskhelia", "PSG", "FWD"],
  ["Jarell Quansah", "LEV", "DEF"],
  ["Jan Oblak", "ATM", "GK"],
  ["Serhou Guirassy", "BVB", "FWD"],
  ["Eberechi Eze", "ARS", "MID"],
  ["Nick Pope", "NEW", "GK"],
  ["Gerónimo Rulli", "OM", "GK"],
  ["Michele Di Gregorio", "JUV", "GK"],
  ["Edmond Tapsoba", "LEV", "DEF"],
  ["Ollie Watkins", "AVL", "FWD"],
  ["Pierre-Emile Højbjerg", "OM", "MID"],
  ["Robin Le Normand", "ATM", "DEF"],
  ["Viktor Gyökeres", "ARS", "FWD"],
  ["Dean Henderson", "CRY", "GK"],
  ["Daniel Svensson", "BVB", "DEF"],
  ["Serge Gnabry", "FCB", "FWD"],
  ["Xavi Simons", "TOT", "MID"],
  ["Angelo Stiller", "VFB", "MID"],
  ["Lucas Chevalier", "PSG", "GK"],
  ["Romelu Lukaku", "NAP", "FWD"],
  ["Matz Sels", "NFO", "GK"],
  ["Sandro Tonali", "NEW", "MID"],
  ["Amad Diallo", "MUN", "FWD"],
  ["Denzel Dumfries", "INT", "DEF"],
  ["Ola Aina", "NFO", "DEF"],
  ["Felix Nmecha", "BVB", "MID"],
  ["Maghnes Akliouche", "ASM", "MID"],
  ["Kevin De Bruyne", "NAP", "MID"],
  ["Manuel Neuer", "FCB", "GK"],
  ["Jonathan David", "JUV", "FWD"],
  ["Omar Marmoush", "MCI", "FWD"],
  ["Nick Woltemade", "NEW", "FWD"],
  ["Nicolò Barella", "INT", "MID"],
  ["Matías Soulé", "ROM", "FWD"],
  ["Exequiel Palacios", "LEV", "MID"],
  ["Marcus Rashford", "BAR", "FWD"],
  ["Mohammed Kudus", "TOT", "MID"],
  ["Alexander Isak", "LIV", "FWD"],
  ["Mark Flekken", "LEV", "GK"],
  ["Jobe Bellingham", "BVB", "MID"],
  ["Karim Adeyemi", "BVB", "FWD"],
  ["Malik Tillman", "LEV", "MID"],
  ["Alessio Romagnoli", "LAZ", "DEF"],
  ["Éder Militão", "RMA", "DEF"],
  ["Rasmus Højlund", "NAP", "FWD"],
  ["Strahinja Pavlovic", "MIL", "DEF"],
  ["Jonathan Burkardt", "SGE", "FWD"],
  ["Leny Yoro", "MUN", "DEF"],
  ["Joe Rodon", "LEE", "DEF"],
  ["James Trafford", "MCI", "GK"],
];

async function main() {
  console.log("Updating player teams and positions...\n");

  let updated = 0;
  let notFound = 0;
  const unknownTeams = new Set<string>();

  for (const [name, teamAbbr, posAbbr] of playerData) {
    const teamName = TEAMS[teamAbbr];
    const position = POSITIONS[posAbbr];

    if (!teamName) {
      unknownTeams.add(teamAbbr);
    }

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("display_name", name)
      .single();

    if (player) {
      const { error } = await supabase
        .from("players")
        .update({
          team_name: teamName || teamAbbr,
          position: position || posAbbr,
        })
        .eq("id", player.id);

      if (error) {
        console.log(`  Error updating ${name}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      console.log(`  Not found: ${name}`);
      notFound++;
    }
  }

  if (unknownTeams.size > 0) {
    console.log(`\nUnknown team abbreviations: ${[...unknownTeams].join(", ")}`);
  }

  console.log(`\nDone! Updated ${updated} players, ${notFound} not found.`);
}

main().catch(console.error);
