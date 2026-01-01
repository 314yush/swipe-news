/**
 * Price Data Service
 * Fetches real-time prices from various sources
 * Falls back to mock data if APIs are unavailable
 * 
 * Note: Currently uses mock data. In the future, can integrate with:
 * - Python trading service price endpoint (if added)
 * - Avantis SDK price feed via Python service
 * - Direct price oracle calls
 */

/**
 * Price cache with TTL (Time To Live)
 */
interface PriceCacheEntry {
  price: number;
  timestamp: number;
}

const PRICE_CACHE_TTL = 5000; // 5 seconds
const priceCache: Map<string, PriceCacheEntry> = new Map();

/**
 * Check if cached price is still valid
 */
function isCacheValid(market: string): boolean {
  const entry = priceCache.get(market);
  if (!entry) return false;

  const age = Date.now() - entry.timestamp;
  return age < PRICE_CACHE_TTL;
}

/**
 * Get cached price if valid
 */
function getCachedPrice(market: string): number | null {
  if (isCacheValid(market)) {
    return priceCache.get(market)!.price;
  }
  return null;
}

/**
 * Cache a price
 */
function cachePrice(market: string, price: number): void {
  priceCache.set(market, {
    price,
    timestamp: Date.now(),
  });
}

/**
 * Generate mock price (fallback)
 */
function getMockPrice(market: string): number {
  const basePrices: Record<string, number> = {
    'BTC/USD': 45000,
    'ETH/USD': 2500,
    'SOL/USD': 100,
    'AAPL/USD': 180,
    'NVDA/USD': 500,
    'MSFT/USD': 380,
    'GOOGL/USD': 140,
    'TSLA/USD': 250,
    'META/USD': 350,
    'XAU/USD': 2000,
    'EUR/USD': 1.08,
    'USD/JPY': 150,
  };

  const basePrice = basePrices[market] || 100;
  // Add some randomness (±2%)
  const variation = (Math.random() - 0.5) * 0.04;
  return basePrice * (1 + variation);
}

/**
 * Get price for a single market
 * Currently uses mock data. Can be extended to call Python service price endpoint.
 * 
 * @param publicClient - Deprecated, kept for API compatibility
 * @param market - Market pair (e.g., "BTC/USD")
 * @param useMock - Force use of mock data (for testing)
 */
export async function getPrice(
  publicClient: any = null,
  market: string,
  useMock: boolean = false
): Promise<number> {
  // Check cache first
  const cached = getCachedPrice(market);
  if (cached !== null) {
    return cached;
  }

  // TODO: Add Python service price endpoint call here
  // Example:
  // if (!useMock && TRADING_SERVICE_URL) {
  //   try {
  //     const response = await fetch(`${TRADING_SERVICE_URL}/get-price?market=${market}`);
  //     const data = await response.json();
  //     if (data.price) {
  //       cachePrice(market, data.price);
  //       return data.price;
  //     }
  //   } catch (error) {
  //     console.warn('Failed to fetch price from trading service:', error);
  //   }
  // }

  // Fallback to mock data
  const mockPrice = getMockPrice(market);
  cachePrice(market, mockPrice);
  return mockPrice;
}

/**
 * Get prices for multiple markets
 * Currently uses mock data. Can be extended to call Python service price endpoint.
 * 
 * @param publicClient - Deprecated, kept for API compatibility
 * @param markets - Array of market pairs
 * @param useMock - Force use of mock data
 */
export async function getPrices(
  publicClient: any = null,
  markets: string[],
  useMock: boolean = false
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // Separate markets into cached and uncached
  const uncachedMarkets: string[] = [];
  const cachedPrices: Record<string, number> = {};

  for (const market of markets) {
    const cached = getCachedPrice(market);
    if (cached !== null) {
      cachedPrices[market] = cached;
    } else {
      uncachedMarkets.push(market);
    }
  }

  // Use cached prices
  Object.assign(prices, cachedPrices);

  // Fetch uncached prices
  if (uncachedMarkets.length > 0) {
    // TODO: Add Python service price endpoint call here
    // Example:
    // if (!useMock && TRADING_SERVICE_URL) {
    //   try {
    //     const response = await fetch(`${TRADING_SERVICE_URL}/get-prices`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ markets: uncachedMarkets }),
    //     });
    //     const data = await response.json();
    //     for (const [market, price] of Object.entries(data.prices || {})) {
    //       if (price > 0) {
    //         cachePrice(market, price);
    //         prices[market] = price;
    //       }
    //     }
    //   } catch (error) {
    //     console.warn('Failed to fetch prices from trading service:', error);
    //   }
    // }

    // Use mock data for all uncached
    for (const market of uncachedMarkets) {
      const mockPrice = getMockPrice(market);
      cachePrice(market, mockPrice);
      prices[market] = mockPrice;
    }
  }

  return prices;
}

/**
 * Clear price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Clear cache for a specific market
 */
export function clearMarketCache(market: string): void {
  priceCache.delete(market);
}

export default {
  getPrice,
  getPrices,
  clearPriceCache,
  clearMarketCache,
};

