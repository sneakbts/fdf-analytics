import { TeneroToken } from "@/types";

const TENERO_API_BASE = "https://api.tenero.io/v1/sportsfun";

export async function fetchAllTeneroTokens(): Promise<TeneroToken[]> {
  const allTokens: TeneroToken[] = [];
  let cursor: string | null = null;

  while (true) {
    const url: string = cursor
      ? `${TENERO_API_BASE}/tokens?cursor=${cursor}`
      : `${TENERO_API_BASE}/tokens`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // No caching for price data
    });

    if (!response.ok) {
      throw new Error(`Tenero API error: ${response.status}`);
    }

    const data = await response.json();
    const tokens = data.data?.rows || [];

    // Filter out USDC and other non-player tokens
    const playerTokens = tokens.filter(
      (t: TeneroToken) => t.symbol !== "USDC" && t.name
    );

    allTokens.push(...playerTokens);

    cursor = data.data?.next;
    if (!cursor) break;
  }

  return allTokens;
}

export async function fetchTokenByAddress(
  address: string
): Promise<TeneroToken | null> {
  const tokens = await fetchAllTeneroTokens();
  return tokens.find((t) => t.address === address) || null;
}
