/**
 * API service for trading operations
 * Calls Python trading service directly for all trading operations
 */

import { isSupabaseConfigured, fetchNewsFromSupabase } from './supabase';

// Price cache with TTL (Time To Live)
const priceCache = new Map();
const PRICE_CACHE_TTL = 3000; // 3 seconds cache

/**
 * Get cached price or null if expired
 */
function getCachedPrice(market) {
  const cached = priceCache.get(market);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > PRICE_CACHE_TTL) {
    priceCache.delete(market);
    return null;
  }
  
  return cached.price;
}

/**
 * Cache a price
 */
function cachePrice(market, price) {
  priceCache.set(market, {
    price,
    timestamp: Date.now(),
  });
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}


/**
 * Fetch news articles
 * @param {Object} options
 * @param {string} options.category - Category filter
 * @param {number} options.limit - Number of items
 * @returns {Promise<Array>} News articles
 */
export async function fetchNews({ category = 'Trending', limit = 20 } = {}) {
  // Try RSS API first
  try {
    const { fetchRSSNews, convertRSSToNewsItem } = await import('./rssNews');
    const rssNews = await fetchRSSNews({ category, limit });
    return rssNews.map(convertRSSToNewsItem);
  } catch (error) {
    console.warn('RSS fetch failed, trying Supabase:', error);
  }

  // Fallback to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      return await fetchNewsFromSupabase({ category, limit });
    } catch (error) {
      console.warn('Supabase fetch failed:', error);
    }
  }

  // Return empty array if all methods fail
  console.warn('No news sources available');
  return [];
}

/**
 * Build an unsigned transaction for client-side signing
 * @param {Object} trade - Trade parameters
 * @param {string} trade.privy_user_id - Privy user ID
 * @param {string} trade.wallet_address - Wallet address
 * @param {string} trade.market - Market pair
 * @param {string} trade.direction - 'long' or 'short'
 * @param {number} trade.collateral - Collateral amount
 * @param {number} trade.leverage - Leverage (default: 75)
 * @returns {Promise<Object>} Unsigned transaction data
 */
export async function buildTransaction(trade) {
  const {
    market,
    direction,
    collateral,
    leverage = 75,
    privy_user_id,
    wallet_address,
  } = trade;

  // Validate required fields
  if (!privy_user_id || !wallet_address) {
    throw new Error('privy_user_id and wallet_address are required');
  }

  // Get Python service URL from environment or use default
  const tradingServiceUrl = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:8000';

  try {
    console.log('🔄 [BUILD] Building transaction via Python service', {
      privy_user_id,
      wallet_address,
      market,
      direction,
      collateral,
      leverage,
    });

    const response = await fetch(`${tradingServiceUrl}/build-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privy_user_id,
        wallet_address,
        market_pair: market,
        direction,
        collateral,
        leverage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
      console.error('❌ [BUILD] Python service error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('📥 [BUILD] Transaction built:', data);
    return data;
  } catch (error) {
    console.error('❌ [BUILD] Failed to build transaction:', error);
    throw error;
  }
}

/**
 * Execute a trade
 * @param {Object} trade - Trade parameters
 * @param {string} trade.privy_user_id - Privy user ID
 * @param {string} trade.wallet_address - Wallet address
 * @param {string} trade.market - Market pair
 * @param {string} trade.direction - 'long' or 'short'
 * @param {number} trade.collateral - Collateral amount
 * @param {number} trade.leverage - Leverage (default: 75)
 * @param {number} trade.takeProfit - Take profit percentage (default: 200)
 * @param {number|null} trade.stopLoss - Stop loss percentage (default: null)
 * @param {string} trade.signedTransaction - Signed transaction (optional)
 * @param {number} trade.pairIndex - Pair index from build-transaction (optional)
 * @param {number} trade.tradeIndex - Trade index from build-transaction (optional)
 * @param {number} trade.entryPrice - Entry price from build-transaction (optional)
 * @param {string} trade.txHash - Transaction hash (for external wallet, optional)
 * @returns {Promise<Object>} Trade result
 */
export async function executeTrade(trade) {
  const {
    newsId,
    newsHeadline,
    market,
    direction,
    collateral,
    leverage = 75,
    takeProfit = 200,
    stopLoss = null,
    privy_user_id,
    wallet_address,
    signedTransaction,
    pairIndex,
    tradeIndex,
    entryPrice,
    txHash,
  } = trade;

  // Validate required fields
  if (!privy_user_id || !wallet_address) {
    throw new Error('privy_user_id and wallet_address are required');
  }

  // Get Python service URL from environment or use default
  const tradingServiceUrl = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:8000';

  try {
    console.log('🔄 [TRADE] Starting trade execution via Python service', {
      privy_user_id,
      wallet_address,
      newsId,
      market,
      direction,
      collateral,
      leverage,
    });

    // If txHash is provided (external wallet already sent transaction), we don't need to call Python service
    // Just format the response with the txHash
    if (txHash && !signedTransaction) {
      console.log('🔄 [TRADE] External wallet transaction already sent, formatting response...');
      const tradeData = {
        id: txHash,
        newsId,
        newsHeadline,
        market,
        direction,
        collateral,
        leverage,
        entryPrice: entryPrice || 0,
        currentPrice: entryPrice || 0,
        takeProfit,
        stopLoss,
        pnl: 0,
        pnlPercent: 0,
        openedAt: new Date().toISOString(),
        status: 'active',
        pairIndex: pairIndex || 0,
        tradeIndex: tradeIndex || 0,
        avantisTradeId: txHash,
        txHash: txHash,
      };

      return {
        success: true,
        trade: tradeData,
      };
    }

    // Call Python service directly
    const response = await fetch(`${tradingServiceUrl}/execute-trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privy_user_id,
        wallet_address,
        market_pair: market,
        direction,
        collateral,
        leverage,
        take_profit_percent: takeProfit,
        ...(signedTransaction && {
          signed_transaction: signedTransaction,
          ...(pairIndex !== undefined && { pair_index: pairIndex }),
          ...(tradeIndex !== undefined && { trade_index: tradeIndex }),
          ...(entryPrice !== undefined && { entry_price: entryPrice }),
        }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
      console.error('❌ [TRADE] Python service error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('📥 [TRADE] Python service response:', data);

    if (data && data.success) {
      // Generate consistent avantisTradeId using pair_index and trade_index
      // This ensures trades can be matched during sync regardless of where they were opened
      const avantisTradeId = (data.pair_index !== undefined && data.trade_index !== undefined)
        ? `trade-${data.pair_index}-${data.trade_index}`
        : data.tx_hash; // Fallback to tx_hash if indices not available yet
      
      // Use current time as initial timestamp - will be updated with actual timestamp when synced from Avantis
      // The actual trade opening timestamp will come from Avantis SDK when we fetch trades
      const tradeData = {
        id: data.tx_hash || data.trade_id,
        newsId,
        newsHeadline,
        market,
        direction,
        collateral,
        leverage,
        entryPrice: data.entry_price,
        currentPrice: data.entry_price,
        takeProfit,
        stopLoss,
        pnl: 0,
        pnlPercent: 0,
        openedAt: new Date().toISOString(), // Temporary - will be updated from Avantis on next sync
        status: 'active',
        pairIndex: data.pair_index,
        tradeIndex: data.trade_index,
        avantisTradeId: avantisTradeId, // Use consistent format
        txHash: data.tx_hash,
      };

      console.log('✅ [TRADE] Trade executed successfully:', {
        tradeId: tradeData.id,
        market: tradeData.market,
        direction: tradeData.direction,
        entryPrice: tradeData.entryPrice,
        pairIndex: tradeData.pairIndex,
        tradeIndex: tradeData.tradeIndex,
        txHash: tradeData.txHash,
        avantisTradeId: tradeData.avantisTradeId,
      });

      // Return trade in the format expected by the store
      return {
        success: true,
        trade: tradeData,
      };
    } else {
      console.warn('⚠️ [TRADE] Python service returned unsuccessful response:', data);
      throw new Error(data?.message || 'Trade execution failed');
    }
  } catch (error) {
    console.error('❌ [TRADE] Failed to execute trade:', error);
    console.error('📋 [TRADE] Error details:', {
      message: error.message,
      stack: error.stack,
      privy_user_id,
      market,
      direction,
    });
    throw error;
  }
}

/**
 * Get trades from Avantis SDK via Python service
 * @param {Object} params - Parameters
 * @param {string} params.privy_user_id - Privy user ID
 * @param {string} params.wallet_address - Wallet address
 * @returns {Promise<Object>} Trades data
 */
export async function getTrades(params) {
  const { privy_user_id, wallet_address } = params;

  // Validate required fields
  if (!privy_user_id || !wallet_address) {
    throw new Error('privy_user_id and wallet_address are required');
  }

  // Get Python service URL from environment or use default
  const tradingServiceUrl = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:8000';

  try {
    console.log('🔄 [GET_TRADES] Fetching trades from Python service', {
      privy_user_id,
      wallet_address,
    });

    const response = await fetch(`${tradingServiceUrl}/get-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privy_user_id,
        wallet_address,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
      console.error('❌ [GET_TRADES] Python service error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('📥 [GET_TRADES] Trades fetched:', {
      count: data.trades?.length || 0,
      pending_orders: data.pending_orders || 0,
    });
    
    // Debug: Log first trade structure to see what we're receiving
    if (data.trades && data.trades.length > 0) {
      console.log('🔍 [GET_TRADES] First trade from API:', {
        pair_index: data.trades[0].pair_index,
        trade_index: data.trades[0].trade_index,
        pair_name: data.trades[0].pair_name,
        full_trade: data.trades[0],
      });
    }

    // Format trades for client consumption
    const formatTrade = (trade) => {
      // Validate required fields
      // IMPORTANT: 0 is a valid index! Must check for undefined/null, not falsy
      const pairIndex = (trade.pair_index !== undefined && trade.pair_index !== null) ? Number(trade.pair_index) : null;
      const tradeIndex = (trade.trade_index !== undefined && trade.trade_index !== null) ? Number(trade.trade_index) : null;
      
      // Debug log for validation
      if (pairIndex === null || tradeIndex === null || isNaN(pairIndex) || isNaN(tradeIndex)) {
        console.warn('⚠️ [GET_TRADES] Skipping trade with missing/invalid indices:', {
          pair_index: trade.pair_index,
          trade_index: trade.trade_index,
          pair_index_type: typeof trade.pair_index,
          trade_index_type: typeof trade.trade_index,
          pairIndex_converted: pairIndex,
          tradeIndex_converted: tradeIndex,
          pair_name: trade.pair_name,
          isNaN_pairIndex: isNaN(pairIndex),
          isNaN_tradeIndex: isNaN(tradeIndex),
          full_trade: trade,
        });
        return null; // Will be filtered out
      }
      
      // Debug log for successful validation
      if (pairIndex === 0 || tradeIndex === 0) {
        console.log('✅ [GET_TRADES] Trade with index 0 validated successfully:', {
          pairIndex,
          tradeIndex,
          pair_name: trade.pair_name,
        });
      }
      
      // Use pair_name from API, fallback to Pair-{index} only if absolutely necessary
      const market = trade.pair_name || `Pair-${pairIndex}`;
      
      // Parse timestamp - use opened_at from Avantis (actual trade opening time)
      // Fallback to current time only if no timestamp is available
      let openedAt = null;
      if (trade.opened_at) {
        try {
          // Try parsing as ISO string, Unix timestamp (seconds or milliseconds), or Date object
          let parsed;
          if (typeof trade.opened_at === 'string') {
            // ISO string or other string format
            parsed = new Date(trade.opened_at);
          } else if (typeof trade.opened_at === 'number') {
            // Unix timestamp - check if it's seconds or milliseconds
            // Avantis uses seconds, but JavaScript Date expects milliseconds
            const timestamp = trade.opened_at < 10000000000 
              ? trade.opened_at * 1000  // Seconds, convert to milliseconds
              : trade.opened_at;         // Already milliseconds
            parsed = new Date(timestamp);
          } else {
            parsed = new Date(trade.opened_at);
          }
          
          if (!isNaN(parsed.getTime())) {
            openedAt = parsed.toISOString();
          } else {
            console.warn('⚠️ [GET_TRADES] Invalid opened_at timestamp:', trade.opened_at);
          }
        } catch (e) {
          console.warn('⚠️ [GET_TRADES] Failed to parse opened_at:', trade.opened_at, e);
        }
      }
      
      // Only use current time as fallback if we couldn't parse the timestamp
      if (!openedAt) {
        console.warn('⚠️ [GET_TRADES] No valid opened_at timestamp, using current time as fallback');
        openedAt = new Date().toISOString();
      }
      
      // Parse closed_at timestamp
      let closedAt = undefined;
      if (trade.closed_at) {
        try {
          const parsed = new Date(trade.closed_at);
          closedAt = !isNaN(parsed.getTime()) ? parsed.toISOString() : trade.closed_at;
        } catch (e) {
          closedAt = trade.closed_at;
        }
      }
      
      return {
        id: `trade-${pairIndex}-${tradeIndex}`,
        market: market, // Use resolved pair name
        direction: trade.direction,
        collateral: trade.collateral,
        leverage: trade.leverage,
        entryPrice: trade.entry_price,
        currentPrice: trade.status === 'closed' ? (trade.exit_price || trade.entry_price) : trade.entry_price,
        exitPrice: trade.exit_price,
        takeProfit: trade.take_profit,
        stopLoss: trade.stop_loss,
        pnl: trade.pnl || 0,
        pnlPercent: trade.pnl_percent || 0,
        openedAt: openedAt, // Use actual timestamp from SDK
        closedAt: closedAt,
        status: trade.status || 'active',
        pairIndex: pairIndex, // CRITICAL: Must be preserved for closing trades
        tradeIndex: tradeIndex, // CRITICAL: Must be preserved for closing trades
        avantisTradeId: `trade-${pairIndex}-${tradeIndex}`,
        marketIsOpen: trade.market_is_open !== undefined ? trade.market_is_open : true,
        txHash: null, // Not available from get_trades, would need separate lookup
      };
    };

    // Filter out null trades (those missing required indices)
    const allTrades = (data.trades || []).map(formatTrade).filter(t => t !== null);
    const activeTrades = (data.active_trades || []).map(formatTrade).filter(t => t !== null);
    const closedTrades = (data.closed_trades || []).map(formatTrade).filter(t => t !== null);
    
    // Debug: Log formatted trades to verify pairIndex/tradeIndex are present
    console.log('🔍 [GET_TRADES] Formatted trades summary:', {
      all_count: allTrades.length,
      active_count: activeTrades.length,
      closed_count: closedTrades.length,
      first_active: activeTrades[0] ? {
        id: activeTrades[0].id,
        pairIndex: activeTrades[0].pairIndex,
        tradeIndex: activeTrades[0].tradeIndex,
        market: activeTrades[0].market,
        has_pairIndex: activeTrades[0].pairIndex !== undefined && activeTrades[0].pairIndex !== null,
        has_tradeIndex: activeTrades[0].tradeIndex !== undefined && activeTrades[0].tradeIndex !== null,
      } : null,
    });

    return {
      success: true,
      trades: allTrades,
      activeTrades: activeTrades,
      closedTrades: closedTrades,
      pending_orders: data.pending_orders || 0,
    };
  } catch (error) {
    console.error('❌ [GET_TRADES] Failed to fetch trades:', error);
    throw error;
  }
}

/**
 * Close a trade
 * @param {string} tradeId - Trade ID to close
 * @param {Object} trade - Trade object with current data
 * @param {string} trade.privy_user_id - Privy user ID
 * @param {string} trade.wallet_address - Wallet address
 * @param {number} trade.pairIndex - Pair index from Avantis
 * @param {number} trade.tradeIndex - Trade index from Avantis
 * @returns {Promise<Object>} Close result
 */
export async function closeTrade(tradeId, trade) {
  const {
    privy_user_id,
    wallet_address,
    pairIndex,
    tradeIndex,
    market,
    direction,
    entryPrice,
    collateral,
    leverage,
  } = trade;

  // Validate required fields
  if (!privy_user_id || !wallet_address) {
    throw new Error('privy_user_id and wallet_address are required');
  }

  if (pairIndex === undefined || pairIndex === null || tradeIndex === undefined || tradeIndex === null) {
    throw new Error('pairIndex and tradeIndex are required to close trade');
  }

  // Get Python service URL from environment or use default
  const tradingServiceUrl = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:8000';

  try {
    console.log('🔄 [CLOSE] Starting trade close via Python service', {
      tradeId,
      privy_user_id,
      wallet_address,
      pairIndex,
      tradeIndex,
      market,
      direction,
    });

    const response = await fetch(`${tradingServiceUrl}/close-trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        privy_user_id,
        wallet_address,
        pair_index: pairIndex,
        trade_index: tradeIndex,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
      console.error('❌ [CLOSE] Python service error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('📥 [CLOSE] Python service response:', data);

    if (data && data.success) {
      // Note: Python service returns tx_hash but not exit_price
      // We'll use entry price as exit price for P&L calculation
      // In production, you might want to fetch current price from Avantis SDK
      const exitPrice = entryPrice; // Using entry price as placeholder
      
      // Calculate P&L
      const priceChange = direction === 'long'
        ? (exitPrice - entryPrice) / entryPrice
        : (entryPrice - exitPrice) / entryPrice;
      const pnl = collateral * leverage * priceChange;
      const pnlPercent = priceChange * leverage * 100;

      const closedTrade = {
        ...trade,
        exitPrice,
        pnl,
        pnlPercent,
        closedAt: new Date().toISOString(),
        status: 'closed',
        txHash: data.tx_hash,
      };

      console.log('✅ [CLOSE] Trade closed successfully:', {
        tradeId,
        market: closedTrade.market,
        entryPrice: closedTrade.entryPrice,
        exitPrice: closedTrade.exitPrice,
        pnl: closedTrade.pnl,
        pnlPercent: closedTrade.pnlPercent,
        txHash: closedTrade.txHash,
      });

      return {
        success: true,
        trade: closedTrade,
      };
    } else {
      console.warn('⚠️ [CLOSE] Python service returned unsuccessful response:', data);
      throw new Error(data?.message || 'Trade close failed');
    }
  } catch (error) {
    console.error('❌ [CLOSE] Failed to close trade:', error);
    console.error('📋 [CLOSE] Error details:', {
      message: error.message,
      stack: error.stack,
      tradeId,
      privy_user_id,
      wallet_address,
    });
    throw error;
  }
}

/**
 * Get current prices for markets from Python service
 * @param {Array<string>} markets - List of market pairs
 * @returns {Promise<Object>} Map of market to price
 */
export async function getPrices(markets) {
  if (!markets || markets.length === 0) {
    return {};
  }

  // Check cache first
  const cachedPrices = {};
  const uncachedMarkets = [];
  
  for (const market of markets) {
    const cached = getCachedPrice(market);
    if (cached !== null) {
      cachedPrices[market] = cached;
    } else {
      uncachedMarkets.push(market);
    }
  }

  // If all prices are cached, return immediately
  if (uncachedMarkets.length === 0) {
    return cachedPrices;
  }

  // Get Python service URL from environment or use default
  const tradingServiceUrl = process.env.NEXT_PUBLIC_TRADING_SERVICE_URL || 'http://localhost:8000';

  try {
    console.log('🔄 [GET_PRICES] Fetching prices from Python service', {
      cached: Object.keys(cachedPrices).length,
      uncached: uncachedMarkets.length,
    });

    // Use retry logic for fetching prices
    const fetchPrices = async () => {
      const response = await fetch(`${tradingServiceUrl}/get-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markets: uncachedMarkets,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    };

    const data = await retryWithBackoff(fetchPrices, 2, 500);

    // Debug: Log the response structure
    console.log('🔍 [GET_PRICES] Response from Python service:', {
      success: data?.success,
      has_prices: !!data?.prices,
      prices_keys: data?.prices ? Object.keys(data.prices) : [],
      prices_count: data?.prices ? Object.keys(data.prices).length : 0,
      full_response: data,
    });

    if (data && data.success && data.prices) {
      // Cache the fetched prices
      for (const [market, price] of Object.entries(data.prices)) {
        cachePrice(market, price);
      }

      // Merge cached and fetched prices
      const mergedPrices = { ...cachedPrices, ...data.prices };
      console.log('✅ [GET_PRICES] Returning merged prices:', {
        cached_count: Object.keys(cachedPrices).length,
        fetched_count: Object.keys(data.prices).length,
        merged_count: Object.keys(mergedPrices).length,
        markets: Object.keys(mergedPrices),
      });
      return mergedPrices;
    } else {
      console.error('❌ [GET_PRICES] Invalid response format:', {
        data,
        has_success: !!data?.success,
        has_prices: !!data?.prices,
      });
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('❌ [GET_PRICES] Failed to fetch prices:', error);
    // Don't use mock prices - just return cached prices if available
    // This prevents showing fake price movements for closed markets
    console.warn('⚠️ [GET_PRICES] Price fetch failed, returning cached prices only');
    return cachedPrices; // Return only cached prices, no mock data
  }
}

/**
 * Get user portfolio
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Portfolio data
 * 
 * Note: Trades are managed locally in Zustand store.
 * This function can be extended to fetch from Supabase if needed.
 */
export async function getPortfolio(userId) {
  // Trades are managed locally in Zustand store
  // Can be extended to fetch from Supabase if needed
  return {
    activeTrades: [],
    closedTrades: [],
    stats: {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
    },
  };
}

/**
 * Save user settings
 * @param {string} userId - User ID
 * @param {Object} settings - User settings
 * @returns {Promise<Object>} Updated settings
 * 
 * Note: Settings are saved locally in userStore with localStorage persistence.
 * Can be extended to sync with Supabase if needed.
 */
export async function saveSettings(userId, settings) {
  // Settings are saved locally in userStore with localStorage persistence
  // Can be extended to sync with Supabase if needed
  return {
    success: true,
    settings,
  };
}

export default {
  fetchNews,
  buildTransaction,
  executeTrade,
  closeTrade,
  getTrades,
  getPrices,
  getPortfolio,
  saveSettings,
};


