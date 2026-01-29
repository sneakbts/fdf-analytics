#!/usr/bin/env python3
"""
Import performance data from Excel file into Supabase.
"""

import os
import json
import urllib.request
import pandas as pd

# Load environment
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing environment variables")
    print("Run: source .env.local first")
    exit(1)

def supabase_get(table, select="*"):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def supabase_upsert(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"Error: {e.code} - {e.read().decode()[:200]}")
        return e.code

def normalize_name(name):
    if pd.isna(name):
        return None
    return str(name).lower().strip()

def parse_date(date_str):
    try:
        parts = str(date_str).split("/")
        if len(parts) == 3:
            month, day, year = parts
            if len(year) == 2:
                year = "20" + year
            return f"{year}-{int(month):02d}-{int(day):02d}"
    except:
        pass
    return None

def main():
    print("Loading Excel file...")
    df = pd.read_excel("all scores.xlsx", header=None)

    # Get date columns from row 0 (starting from column 4)
    dates = []
    for col in range(4, len(df.columns)):
        date_val = df.iloc[0, col]
        parsed = parse_date(date_val)
        if parsed:
            dates.append((col, parsed))

    print(f"Found {len(dates)} date columns")

    # Get existing players from database
    print("Fetching players from database...")
    players_data = supabase_get("players", "id,display_name")
    players = {normalize_name(p["display_name"]): p["id"] for p in players_data}
    print(f"Found {len(players)} players in database")

    # Parse performance data
    performance_records = []
    current_player = None
    current_player_id = None
    row_data = {}

    skipped_players = set()
    matched_players = set()

    for idx in range(1, len(df)):
        row = df.iloc[idx]

        display_name = row.iloc[0]
        if pd.notna(display_name) and str(display_name).strip():
            # Save previous player's data
            if current_player_id and row_data:
                for date, metrics in row_data.items():
                    if metrics.get("raw_score") or metrics.get("ranking") or metrics.get("reward"):
                        performance_records.append({
                            "player_id": current_player_id,
                            "match_date": date,
                            "raw_score": metrics.get("raw_score"),
                            "ranking": metrics.get("ranking"),
                            "reward": metrics.get("reward"),
                        })

            current_player = str(display_name).strip()
            normalized = normalize_name(current_player)
            current_player_id = players.get(normalized)

            if not current_player_id:
                for db_name, db_id in players.items():
                    if db_name and normalized:
                        if normalized in db_name or db_name in normalized:
                            current_player_id = db_id
                            break
                        csv_parts = set(normalized.split())
                        db_parts = set(db_name.split())
                        if len(csv_parts & db_parts) >= 1 and len(csv_parts) <= 3:
                            current_player_id = db_id
                            break

            if current_player_id:
                matched_players.add(current_player)
            else:
                skipped_players.add(current_player)

            row_data = {date: {} for _, date in dates}

        metric_type = row.iloc[3]
        if pd.isna(metric_type):
            continue

        metric_type = str(metric_type).strip().lower()

        if current_player_id:
            for col, date in dates:
                val = row.iloc[col]
                if pd.notna(val):
                    try:
                        val = float(val)
                        if metric_type == "raw score":
                            row_data[date]["raw_score"] = int(val) if val == int(val) else round(val, 2)
                        elif metric_type == "ranking":
                            row_data[date]["ranking"] = int(val)
                        elif metric_type == "reward":
                            row_data[date]["reward"] = round(val, 2)
                    except (ValueError, TypeError):
                        pass

    # Last player
    if current_player_id and row_data:
        for date, metrics in row_data.items():
            if metrics.get("raw_score") or metrics.get("ranking") or metrics.get("reward"):
                performance_records.append({
                    "player_id": current_player_id,
                    "match_date": date,
                    "raw_score": metrics.get("raw_score"),
                    "ranking": metrics.get("ranking"),
                    "reward": metrics.get("reward"),
                })

    print(f"\nMatched {len(matched_players)} players")
    print(f"Skipped {len(skipped_players)} players (not in database)")

    if skipped_players:
        print("\nSkipped players (first 15):")
        for name in sorted(skipped_players)[:15]:
            print(f"  - {name}")
        if len(skipped_players) > 15:
            print(f"  ... and {len(skipped_players) - 15} more")

    print(f"\nTotal performance records to insert: {len(performance_records)}")

    if not performance_records:
        print("No records to insert!")
        return

    batch_size = 200
    inserted = 0

    for i in range(0, len(performance_records), batch_size):
        batch = performance_records[i:i + batch_size]
        status = supabase_upsert("performance", batch)
        if status in (200, 201):
            inserted += len(batch)
            print(f"  Inserted batch {i // batch_size + 1}: {len(batch)} records")

    print(f"\nDone! Inserted {inserted} performance records.")

if __name__ == "__main__":
    main()
