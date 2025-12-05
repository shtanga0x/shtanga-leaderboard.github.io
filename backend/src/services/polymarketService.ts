import axios, { AxiosInstance } from 'axios';
import { retryWithBackoff } from './chainService';

export interface PortfolioValue {
  wallet: string;
  totalValue: number; // in USD
  positions: Position[];
}

export interface Position {
  marketId: string;
  tokenId: string;
  balance: number;
  price: number; // current market price
  value: number; // balance * price
}

/**
 * Service for interacting with Polymarket API
 */
export class PolymarketService {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: 'https://clob.polymarket.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    });
  }

  /**
   * Fetch portfolio value for a wallet
   * Note: This is a simplified implementation. Actual Polymarket API endpoints may differ.
   *
   * Polymarket's official API documentation should be consulted for exact endpoints.
   * This implementation provides a structure that can be adapted to the real API.
   */
  async fetchPortfolioValue(wallet: string): Promise<PortfolioValue> {
    try {
      // Attempt to use portfolio endpoint if available
      const portfolioValue = await this.tryFetchDirectPortfolio(wallet);
      if (portfolioValue !== null) {
        return portfolioValue;
      }

      // Fallback: reconstruct portfolio from positions
      return await this.reconstructPortfolio(wallet);
    } catch (error) {
      console.error(`Error fetching portfolio for ${wallet}:`, error);
      throw error;
    }
  }

  /**
   * Try to fetch portfolio directly from API (if endpoint exists)
   */
  private async tryFetchDirectPortfolio(wallet: string): Promise<PortfolioValue | null> {
    try {
      // Example endpoint structure (may need adjustment based on actual API)
      const response = await retryWithBackoff(() =>
        this.client.get(`/portfolio/${wallet}`)
      );

      if (response.data && typeof response.data.totalValue === 'number') {
        return {
          wallet,
          totalValue: response.data.totalValue,
          positions: response.data.positions || [],
        };
      }

      return null;
    } catch (error: any) {
      // If endpoint doesn't exist or returns 404, return null to trigger fallback
      if (error.response?.status === 404) {
        console.log('Direct portfolio endpoint not available, using fallback');
        return null;
      }
      throw error;
    }
  }

  /**
   * Reconstruct portfolio value from positions and market prices
   */
  private async reconstructPortfolio(wallet: string): Promise<PortfolioValue> {
    console.log(`Reconstructing portfolio for ${wallet}...`);

    // Step 1: Fetch user's positions
    const positions = await this.fetchUserPositions(wallet);

    if (positions.length === 0) {
      return {
        wallet,
        totalValue: 0,
        positions: [],
      };
    }

    // Step 2: Fetch current prices for each position
    const marketIds = [...new Set(positions.map((p) => p.marketId))];
    const prices = await this.fetchMarketPrices(marketIds);

    // Step 3: Calculate total value
    let totalValue = 0;
    const valuedPositions: Position[] = [];

    for (const position of positions) {
      const price = prices.get(position.marketId) || 0;
      const value = position.balance * price;

      valuedPositions.push({
        ...position,
        price,
        value,
      });

      totalValue += value;
    }

    return {
      wallet,
      totalValue,
      positions: valuedPositions,
    };
  }

  /**
   * Fetch user's open positions
   */
  private async fetchUserPositions(wallet: string): Promise<Omit<Position, 'price' | 'value'>[]> {
    try {
      // This would typically call an endpoint like /positions/:wallet
      // For now, return empty array as placeholder
      // Real implementation would parse response into Position objects

      const response = await retryWithBackoff(() =>
        this.client.get(`/positions`, {
          params: { wallet },
        })
      );

      // Parse response (structure depends on actual API)
      const positions = response.data?.positions || [];

      return positions.map((p: any) => ({
        marketId: p.market_id || p.marketId,
        tokenId: p.token_id || p.tokenId,
        balance: parseFloat(p.balance || 0),
      }));
    } catch (error: any) {
      console.error(`Error fetching positions for ${wallet}:`, error);
      // Return empty positions instead of throwing
      return [];
    }
  }

  /**
   * Fetch current market prices
   */
  private async fetchMarketPrices(marketIds: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    try {
      // Batch fetch market data
      // Actual endpoint structure may vary
      const response = await retryWithBackoff(() =>
        this.client.get('/markets', {
          params: {
            ids: marketIds.join(','),
          },
        })
      );

      const markets = response.data?.markets || [];

      for (const market of markets) {
        const marketId = market.id || market.market_id;
        const price = parseFloat(market.price || market.last_price || 0);
        prices.set(marketId, price);
      }
    } catch (error) {
      console.error('Error fetching market prices:', error);
      // Set default prices to 0 on error
      for (const marketId of marketIds) {
        if (!prices.has(marketId)) {
          prices.set(marketId, 0);
        }
      }
    }

    return prices;
  }

  /**
   * Get account creation date (first trade date)
   * This helps determine if account is "old" (created before tournament start)
   */
  async getFirstTradeDate(wallet: string): Promise<Date | null> {
    try {
      // Fetch trade history
      const response = await retryWithBackoff(() =>
        this.client.get('/trades', {
          params: {
            wallet,
            limit: 1,
            order: 'asc', // oldest first
          },
        })
      );

      const trades = response.data?.trades || [];

      if (trades.length > 0) {
        const firstTrade = trades[0];
        return new Date(firstTrade.timestamp || firstTrade.created_at);
      }

      return null;
    } catch (error) {
      console.error(`Error fetching first trade for ${wallet}:`, error);
      return null;
    }
  }

  /**
   * Simple health check for API availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Fallback: Estimate portfolio value as deposit_sum (conservative estimate)
 * Used when Polymarket API is unavailable
 */
export function estimatePortfolioFromDeposits(depositSum: number): number {
  console.warn('Using fallback portfolio estimation from deposits');
  return depositSum; // Conservative: assume no profit/loss
}
