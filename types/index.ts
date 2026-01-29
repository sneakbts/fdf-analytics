export interface Player {
  id: string;
  display_name: string;
  team_name: string | null;
  position: string | null;
  token_symbol: string | null;
  token_address: string | null;
  active_shares: number | null;
  circulating_shares: number | null;
  created_at: string;
}

export interface Price {
  id: string;
  player_id: string;
  price_usd: number;
  marketcap_usd: number | null;
  holder_count: number | null;
  fetched_at: string;
}

export interface Performance {
  id: string;
  player_id: string;
  match_date: string;
  raw_score: number | null;
  ranking: number | null;
  reward: number | null;
}

export interface TeneroToken {
  address: string;
  symbol: string;
  name: string;
  price_usd: number;
  marketcap_usd: number;
  holder_count: number;
  total_liquidity_usd: number;
}

export interface PlayerWithLatestPrice extends Player {
  latest_price: number | null;
  latest_marketcap: number | null;
  price_change_24h: number | null;
}
