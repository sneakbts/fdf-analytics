-- Sports.fun Analytics Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  team_name TEXT,
  position TEXT,
  token_symbol TEXT,
  token_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for name lookups
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);
CREATE INDEX IF NOT EXISTS idx_players_token_address ON players(token_address);

-- Prices table (time series)
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  price_usd DECIMAL(18, 8),
  marketcap_usd DECIMAL(18, 2),
  holder_count INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_prices_player_time ON prices(player_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_fetched_at ON prices(fetched_at DESC);

-- Performance table
CREATE TABLE IF NOT EXISTS performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  raw_score INTEGER,
  ranking INTEGER,
  reward DECIMAL(18, 2),
  UNIQUE(player_id, match_date)
);

-- Create index for performance lookups
CREATE INDEX IF NOT EXISTS idx_perf_player_date ON performance(player_id, match_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Public read access for prices"
  ON prices FOR SELECT
  USING (true);

CREATE POLICY "Public read access for performance"
  ON performance FOR SELECT
  USING (true);

-- Service role has full access (for cron jobs and admin operations)
-- Note: Service role bypasses RLS by default

-- Optional: Create a function to clean up old price data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_prices()
RETURNS void AS $$
BEGIN
  DELETE FROM prices
  WHERE fetched_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create authenticated user policies for write operations
-- Uncomment these if you want to allow authenticated users to modify data

-- CREATE POLICY "Authenticated users can insert players"
--   ON players FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can update players"
--   ON players FOR UPDATE
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Authenticated users can insert performance"
--   ON performance FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can update performance"
--   ON performance FOR UPDATE
--   TO authenticated
--   USING (true);
