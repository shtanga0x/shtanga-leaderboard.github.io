/**
 * Application configuration constants
 */

export const POLYMARKET_PROFILE_BASE_URL = 'https://polymarket.com/profile/';

/**
 * Generate Polymarket profile URL from wallet address
 */
export function getPolymarketProfileUrl(wallet: string): string {
  return `${POLYMARKET_PROFILE_BASE_URL}${wallet}`;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, includeSign: boolean = false): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (includeSign && value >= 0) {
    return `+${formatted}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
}
