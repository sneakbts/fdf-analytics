import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a name for matching (lowercase, remove accents, trim)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .trim()
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the best matching name from a list
 */
export function findBestMatch(
  target: string,
  candidates: string[]
): { match: string; distance: number } | null {
  const normalizedTarget = normalizeName(target);

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);

    // Exact match
    if (normalizedCandidate === normalizedTarget) {
      return { match: candidate, distance: 0 };
    }

    const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  // Only accept matches with distance < 3 (allowing for minor typos)
  if (bestMatch && bestDistance < 3) {
    return { match: bestMatch, distance: bestDistance };
  }

  return null;
}

/**
 * Format USD price
 */
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "N/A";
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

/**
 * Format large numbers (marketcap, etc.)
 */
export function formatLargeNumber(num: number | null): string {
  if (num === null || num === undefined) return "N/A";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

/**
 * Format percentage change
 */
export function formatPercentChange(change: number | null): string {
  if (change === null || change === undefined) return "N/A";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
