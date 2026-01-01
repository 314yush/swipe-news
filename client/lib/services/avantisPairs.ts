/**
 * Avantis Pairs Cache Service
 * 
 * Fetches and caches Avantis trading pairs data including:
 * - Maximum leverage per pair
 * - Minimum position size (USDC)
 * - Pair availability
 * - Other pair-specific parameters
 * 
 * IMPORTANT: Minimum collateral and max leverage are static values that don't change.
 * Therefore, data is cached aggressively:
 * - In-memory cache: 5 minutes (for performance)
 * - LocalStorage cache: 7 days (since values are static)
 * - Cache is only refreshed if explicitly requested or if cache doesn't exist
 * 
 * This avoids unnecessary API calls for data that never changes.
 */

interface AvantisPairInfo {
  index: number;
  from: string;
  to: string;
  isPairListed: boolean;
  leverages: {
    minLeverage: number;
    maxLeverage: number;
    pnlMinLeverage: number;
    pnlMaxLeverage: number;
  };
  minLevPosUSDC: number;
  pairMinLevPosUSDC: number;
  spreadP: number;
  openFeeP: number;
  closeFeeP: number;
  groupIndex: number;
  feed: {
    feedId: string;
    attributes: {
      symbol: string;
      asset_type: string;
      is_open: boolean;
    };
  };
}

interface AvantisDataResponse {
  data: {
    dataVersion: number;
    pairInfos: Record<string, AvantisPairInfo>;
    pairCount: number;
    overrides?: {
      pairInfos?: Record<string, Partial<AvantisPairInfo>>;
    };
  };
  success: boolean;
}

interface PairCacheEntry {
  pairInfo: AvantisPairInfo;
  lastUpdated: number;
}

// In-memory cache
let pairsCache: Map<string, PairCacheEntry> = new Map();
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// LocalStorage cache keys
const STORAGE_KEY = 'avantis_pairs_cache';
const STORAGE_TIMESTAMP_KEY = 'avantis_pairs_cache_timestamp';
// Since minimum collateral and max leverage don't change, we can cache them for a very long time
// Only refresh if explicitly requested or if cache doesn't exist
const STORAGE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for localStorage (these values are static)

/**
 * Manual overrides for minimum position sizes
 * These override API values when the API data is incorrect or outdated
 * 
 * Note: The Avantis API sometimes returns incorrect minimum position sizes.
 * These overrides ensure we use the correct values as per actual Avantis platform.
 * 
 * Format: "PAIR": minSize
 */
const MIN_POSITION_SIZE_OVERRIDES: Record<string, number> = {
  // Crypto pairs - typically $1 minimum
  'BTC/USD': 1,
  'ETH/USD': 1,
  'SOL/USD': 1,
  'BNB/USD': 1,
  'XRP/USD': 1,
  'ADA/USD': 1,
  'DOGE/USD': 1,
  'AVAX/USD': 1,
  'LINK/USD': 1,
  'ARB/USD': 1,
  'OP/USD': 1,
  'PEPE/USD': 1,
  'SHIB/USD': 1,
  'WIF/USD': 1,
  'APT/USD': 1,
  'INJ/USD': 1,
  'NEAR/USD': 1,
  'SEI/USD': 1,
  'SUI/USD': 1,
  'TIA/USD': 1,
  'AAVE/USD': 1,
  'BONK/USD': 1,
  'JUP/USD': 1,
  'LDO/USD': 1,
  'ORDI/USD': 1,
  'RENDER/USD': 1,
  'STX/USD': 1,
  'WLD/USD': 1,
  
  // Stocks - typically $1 minimum
  'AAPL/USD': 1,
  'AMZN/USD': 1,
  'GOOG/USD': 1,
  'GOOGL/USD': 1,
  'META/USD': 1,
  'MSFT/USD': 1,
  'NVDA/USD': 1,
  'TSLA/USD': 1,
  'HOOD/USD': 1,
  'COIN/USD': 1,
  'SPY/USD': 1,
  'QQQ/USD': 1,
  'TRUMP/USD': 1, // Trump token
  
  // Forex and Commodities - use API values (they vary)
  // XAU/USD: 300 (from API)
  // EUR/USD: 750 (from API)
  // These are kept as API values since they're likely correct
};

// Use Next.js API route as proxy to bypass CORS
// In production, this will be the same origin, avoiding CORS issues
const getApiUrl = () => {
  // Use relative URL for same-origin requests (bypasses CORS)
  if (typeof window !== 'undefined') {
    return '/api/avantis-pairs';
  }
  // Fallback for server-side (shouldn't happen, but just in case)
  return 'https://socket-api-pub.avantisfi.com/socket-api/v1/data';
};

/**
 * Normalize pair string to match Avantis format
 * Examples: "ETH/USD" -> "ETH/USD", "BTC/USD" -> "BTC/USD"
 */
function normalizePair(pair: string): string {
  return pair.toUpperCase().trim();
}

/**
 * Fetch pairs data from Avantis API via Next.js proxy
 */
async function fetchPairsData(): Promise<AvantisDataResponse> {
  const apiUrl = getApiUrl();
  console.log('[AVANTIS_PAIRS] Fetching pairs data via proxy:', apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache at fetch level - we handle caching in this service
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AVANTIS_PAIRS] API error response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: AvantisDataResponse = await response.json();
    
    // Check if proxy returned an error
    if (!data.success && data.error) {
      throw new Error(data.error || 'Proxy returned error');
    }
    
    if (!data.success || !data.data) {
      throw new Error('Invalid API response format');
    }

    console.log(`[AVANTIS_PAIRS] ✅ Fetched ${data.data.pairCount} pairs via proxy`);
    return data;
  } catch (error) {
    console.error('[AVANTIS_PAIRS] ❌ Failed to fetch pairs data:', error);
    throw error;
  }
}

/**
 * Build pair lookup map from API data
 * Maps "FROM/TO" format to pair index
 */
function buildPairMap(data: AvantisDataResponse): Map<string, PairCacheEntry> {
  const map = new Map<string, PairCacheEntry>();
  const now = Date.now();

  // Process base pairInfos
  for (const [indexStr, pairInfo] of Object.entries(data.data.pairInfos)) {
    // Apply overrides if they exist
    const overrides = data.data.overrides?.pairInfos?.[indexStr];
    const finalPairInfo: AvantisPairInfo = {
      ...pairInfo,
      ...overrides,
      index: parseInt(indexStr),
    };

    // Only cache listed pairs
    if (finalPairInfo.isPairListed !== false) {
      const pairKey = `${finalPairInfo.from}/${finalPairInfo.to}`;
      
      // Log min position size for debugging (sample a few pairs)
      if (['BTC/USD', 'ETH/USD', 'SOL/USD', 'XAU/USD', 'EUR/USD'].includes(pairKey)) {
        const override = MIN_POSITION_SIZE_OVERRIDES[pairKey];
        console.log(`[AVANTIS_PAIRS] Sample pair ${pairKey}:`, {
          pairMinLevPosUSDC: finalPairInfo.pairMinLevPosUSDC,
          minLevPosUSDC: finalPairInfo.minLevPosUSDC,
          override: override ? `$${override} (override)` : 'none',
          finalMinSize: override || finalPairInfo.pairMinLevPosUSDC || finalPairInfo.minLevPosUSDC || 1,
          maxLeverage: finalPairInfo.leverages.maxLeverage,
        });
      }
      
      map.set(pairKey, {
        pairInfo: finalPairInfo,
        lastUpdated: now,
      });
    }
  }

  console.log(`[AVANTIS_PAIRS] Built pair map with ${map.size} listed pairs`);
  return map;
}

/**
 * Load cache from localStorage
 * Since minimum collateral and max leverage are static, we accept cache regardless of age
 * (unless it's extremely old, which is handled in getOrRefreshCache)
 */
function loadCacheFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    if (!storedData || !storedTimestamp) {
      return false;
    }
    
    const timestamp = parseInt(storedTimestamp, 10);
    const now = Date.now();
    const cacheAge = now - timestamp;
    
    // Parse and restore cache
    // Note: We don't check STORAGE_TTL here because these values are static
    // The age check is done in getOrRefreshCache with a much longer threshold
    const parsedData = JSON.parse(storedData);
    pairsCache = new Map<string, PairCacheEntry>();
    
    for (const [pair, entry] of Object.entries(parsedData)) {
      pairsCache.set(pair, entry as PairCacheEntry);
    }
    
    cacheTimestamp = timestamp;
    const ageDays = Math.round(cacheAge / (24 * 60 * 60 * 1000));
    const ageHours = Math.round((cacheAge % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    console.log(`[AVANTIS_PAIRS] ✅ Loaded ${pairsCache.size} pairs from localStorage (age: ${ageDays}d ${ageHours}h)`);
    return true;
  } catch (error) {
    console.warn('[AVANTIS_PAIRS] ⚠️ Failed to load cache from localStorage:', error);
    return false;
  }
}

/**
 * Save cache to localStorage
 */
function saveCacheToStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheObject: Record<string, PairCacheEntry> = {};
    for (const [pair, entry] of pairsCache.entries()) {
      cacheObject[pair] = entry;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObject));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, cacheTimestamp.toString());
    
    console.log(`[AVANTIS_PAIRS] 💾 Saved ${pairsCache.size} pairs to localStorage`);
  } catch (error) {
    console.warn('[AVANTIS_PAIRS] ⚠️ Failed to save cache to localStorage:', error);
    // localStorage might be full or disabled - not critical, continue with in-memory cache
  }
}

/**
 * Get or refresh pairs cache
 * Since minimum collateral and max leverage are static values that don't change,
 * we prioritize localStorage cache and only fetch from API if cache doesn't exist.
 */
async function getOrRefreshCache(forceRefresh = false): Promise<Map<string, PairCacheEntry>> {
  const now = Date.now();
  const cacheAge = now - cacheTimestamp;

  // Try to load from localStorage first if in-memory cache is empty
  if (pairsCache.size === 0 && !forceRefresh) {
    const loaded = loadCacheFromStorage();
    if (loaded) {
      // Since these values are static, we trust localStorage cache regardless of age
      // (unless it's extremely old, which would indicate a problem)
      const newCacheAge = now - cacheTimestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days max age
      
      if (newCacheAge < maxAge) {
        console.log(`[AVANTIS_PAIRS] Using localStorage cache (age: ${Math.round(newCacheAge / (24 * 60 * 60 * 1000))} days)`);
        return pairsCache;
      } else {
        console.warn(`[AVANTIS_PAIRS] localStorage cache too old (${Math.round(newCacheAge / (24 * 60 * 60 * 1000))} days), will refresh`);
      }
    }
  }

  // Return in-memory cached data if still valid
  if (!forceRefresh && cacheAge < CACHE_TTL && pairsCache.size > 0) {
    console.log(`[AVANTIS_PAIRS] Using in-memory cache (age: ${Math.round(cacheAge / 1000)}s)`);
    return pairsCache;
  }

  // Only fetch fresh data if:
  // 1. Force refresh requested
  // 2. No cache exists at all
  // 3. Cache is extremely old (> 30 days)
  try {
    const data = await fetchPairsData();
    pairsCache = buildPairMap(data);
    cacheTimestamp = now;
    
    // Save to localStorage for persistence (will last 7 days)
    saveCacheToStorage();
    
    return pairsCache;
  } catch (error) {
    // If fetch fails, try to use localStorage cache even if expired
    if (pairsCache.size === 0) {
      const loaded = loadCacheFromStorage();
      if (loaded) {
        console.warn('[AVANTIS_PAIRS] ⚠️ Using localStorage cache due to fetch error');
        return pairsCache;
      }
    }
    
    // If we have in-memory cache, use it
    if (pairsCache.size > 0) {
      console.warn('[AVANTIS_PAIRS] ⚠️ Using stale in-memory cache due to fetch error');
      return pairsCache;
    }
    
    throw error;
  }
}

/**
 * Get pair info for a specific trading pair
 * @param pair - Trading pair in "FROM/TO" format (e.g., "ETH/USD")
 * @returns Pair info or null if not found
 */
export async function getPairInfo(pair: string): Promise<AvantisPairInfo | null> {
  const normalizedPair = normalizePair(pair);
  const cache = await getOrRefreshCache();
  
  const entry = cache.get(normalizedPair);
  if (!entry) {
    console.warn(`[AVANTIS_PAIRS] ⚠️ Pair not found: ${normalizedPair}`);
    return null;
  }

  return entry.pairInfo;
}

/**
 * Get maximum leverage for a trading pair
 * @param pair - Trading pair in "FROM/TO" format
 * @param usePnlLeverage - Use PnL (zero-fee) leverage if available (default: false)
 * @returns Maximum leverage or 75 as fallback
 */
export async function getMaxLeverage(
  pair: string,
  usePnlLeverage = false
): Promise<number> {
  const pairInfo = await getPairInfo(pair);
  
  if (!pairInfo) {
    console.warn(`[AVANTIS_PAIRS] ⚠️ Pair info not found for ${pair}, using default leverage 75`);
    return 75;
  }

  const leverage = usePnlLeverage 
    ? pairInfo.leverages.pnlMaxLeverage 
    : pairInfo.leverages.maxLeverage;

  console.log(`[AVANTIS_PAIRS] Max leverage for ${pair}: ${leverage}x (PnL: ${usePnlLeverage})`);
  return leverage;
}

/**
 * Get minimum position size (USDC) for a trading pair
 * @param pair - Trading pair in "FROM/TO" format
 * @returns Minimum position size in USDC
 */
export async function getMinPositionSize(pair: string): Promise<number> {
  const normalizedPair = normalizePair(pair);
  
  // Check manual overrides first (these take precedence)
  if (MIN_POSITION_SIZE_OVERRIDES[normalizedPair]) {
    const overrideValue = MIN_POSITION_SIZE_OVERRIDES[normalizedPair];
    console.log(`[AVANTIS_PAIRS] Using override min position size for ${normalizedPair}: $${overrideValue}`);
    return overrideValue;
  }
  
  const pairInfo = await getPairInfo(normalizedPair);
  
  if (!pairInfo) {
    console.warn(`[AVANTIS_PAIRS] ⚠️ Pair info not found for ${normalizedPair}, using default min $1`);
    return 1;
  }

  // Log the raw values for debugging
  console.log(`[AVANTIS_PAIRS] Raw min position values for ${normalizedPair}:`, {
    pairMinLevPosUSDC: pairInfo.pairMinLevPosUSDC,
    minLevPosUSDC: pairInfo.minLevPosUSDC,
  });

  // Use pairMinLevPosUSDC if available and > 0, otherwise minLevPosUSDC, fallback to 1
  // Note: Some pairs might have 0 or undefined, so we check for truthy values > 0
  let minSize = 1; // Default fallback
  
  if (pairInfo.pairMinLevPosUSDC && pairInfo.pairMinLevPosUSDC > 0) {
    minSize = pairInfo.pairMinLevPosUSDC;
  } else if (pairInfo.minLevPosUSDC && pairInfo.minLevPosUSDC > 0) {
    minSize = pairInfo.minLevPosUSDC;
  }
  
  console.log(`[AVANTIS_PAIRS] Min position size for ${normalizedPair}: $${minSize} (from API)`);
  return minSize;
}

/**
 * Get optimal trade parameters: minimum collateral and maximum leverage
 * This ensures trades are opened with the smallest possible collateral and highest leverage
 * @param pair - Trading pair
 * @returns Optimal collateral (minimum) and max leverage
 */
export async function getOptimalTradeParams(
  pair: string
): Promise<{ collateral: number; leverage: number; minSize: number; maxLeverage: number }> {
  const [minSize, maxLeverage] = await Promise.all([
    getMinPositionSize(pair),
    getMaxLeverage(pair),
  ]);
  
  console.log(`[AVANTIS_PAIRS] Optimal trade params for ${pair}:`, {
    collateral: `$${minSize} (minimum)`,
    leverage: `${maxLeverage}x (maximum)`,
    positionSize: `$${minSize * maxLeverage}`,
  });
  
  return {
    collateral: minSize, // Always use minimum
    leverage: maxLeverage, // Always use maximum
    minSize,
    maxLeverage,
  };
}

/**
 * Validate and adjust collateral to meet minimum position size
 * @param pair - Trading pair
 * @param collateral - User's desired collateral
 * @returns Adjusted collateral (at least minimum)
 * @deprecated Use getOptimalTradeParams instead for always using minimum
 */
export async function validateCollateral(
  pair: string,
  collateral: number
): Promise<{ collateral: number; adjusted: boolean; minSize: number }> {
  const minSize = await getMinPositionSize(pair);
  
  if (collateral < minSize) {
    console.warn(
      `[AVANTIS_PAIRS] ⚠️ Collateral $${collateral} below minimum $${minSize} for ${pair}, adjusting to minimum`
    );
    return {
      collateral: minSize,
      adjusted: true,
      minSize,
    };
  }

  return {
    collateral,
    adjusted: false,
    minSize,
  };
}

/**
 * Check if a pair is available for trading
 * @param pair - Trading pair
 * @returns true if pair is listed and available
 */
export async function isPairAvailable(pair: string): Promise<boolean> {
  const pairInfo = await getPairInfo(pair);
  return pairInfo !== null && pairInfo.isPairListed !== false;
}

/**
 * Pre-warm the cache (call on app startup)
 * This will load from localStorage if available, or fetch from API if needed.
 * Since these values are static, we prioritize localStorage and only fetch if missing.
 */
export async function prewarmCache(): Promise<void> {
  console.log('[AVANTIS_PAIRS] 🔄 Pre-warming pairs cache...');
  try {
    // Try to load from localStorage first
    const loadedFromStorage = loadCacheFromStorage();
    
    if (loadedFromStorage) {
      const now = Date.now();
      const cacheAge = now - cacheTimestamp;
      const ageDays = Math.round(cacheAge / (24 * 60 * 60 * 1000));
      
      // Since these values are static, we use localStorage cache if it exists
      // Only refresh if cache is extremely old (> 30 days) or missing
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (cacheAge < maxAge) {
        console.log(`[AVANTIS_PAIRS] ✅ Cache pre-warmed from localStorage (${pairsCache.size} pairs, age: ${ageDays} days)`);
        return;
      }
      
      // Cache is extremely old, refresh in background
      console.log(`[AVANTIS_PAIRS] Cache is very old (${ageDays} days), refreshing in background...`);
      getOrRefreshCache(true).catch((error) => {
        console.warn('[AVANTIS_PAIRS] Background refresh failed, using stale cache:', error);
      });
    } else {
      // No localStorage cache, fetch fresh data
      await getOrRefreshCache(true);
      console.log(`[AVANTIS_PAIRS] ✅ Cache pre-warmed with ${pairsCache.size} pairs`);
    }
  } catch (error) {
    console.error('[AVANTIS_PAIRS] ❌ Failed to pre-warm cache:', error);
    // Don't throw - app can still work with fallback values
  }
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  pairsCache.clear();
  cacheTimestamp = 0;
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      console.log('[AVANTIS_PAIRS] 🗑️ Cache cleared');
    } catch (error) {
      console.warn('[AVANTIS_PAIRS] ⚠️ Failed to clear localStorage cache:', error);
    }
  }
}

/**
 * Get all available pairs
 */
export async function getAllPairs(): Promise<string[]> {
  const cache = await getOrRefreshCache();
  return Array.from(cache.keys());
}

/**
 * Force refresh the cache
 */
export async function refreshCache(): Promise<void> {
  console.log('[AVANTIS_PAIRS] 🔄 Force refreshing cache...');
  await getOrRefreshCache(true);
  console.log(`[AVANTIS_PAIRS] ✅ Cache refreshed with ${pairsCache.size} pairs`);
}

