/**
 * API service for edge function calls
 * Uses Supabase Edge Functions for real trading operations
 */

import { isSupabaseConfigured, fetchNewsFromSupabase, saveTrade, updateTrade } from './supabase';

// Simulated delay for mock API calls
const MOCK_DELAY = 500;

/**
 * Simulate API delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate mock price for a market
 */
function getMockPrice(market) {
  const basePrices = {
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
 * @returns {Promise<Object>} Unsigned transaction data
 */
export async function buildTransaction(trade) {
  const {
    market,
    direction,
    collateral,
    leverage = 75,
    userId,
  } = trade;

  // Try to build via Edge Function if Supabase is configured
  if (isSupabaseConfigured() && userId) {
    try {
      console.log('🔄 [BUILD] Building transaction via Python service', {
        userId,
        market,
        direction,
        collateral,
        leverage,
      });

      // Get user's Privy info from Supabase
      const { getSupabase } = await import('./supabase');
      const supabase = getSupabase();
      
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Get user's Privy info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, privy_user_id, privy_wallet_address, wallet_address')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Use Next.js API route (preferred) or fallback to Supabase Edge Function
      const useNextApiRoute = true; // Always use Next.js API route for client-side deployment
      
      let data, error;
      
      if (useNextApiRoute) {
        // Use Next.js API route (same origin, no CORS issues)
        console.log('🔄 [BUILD] Using Next.js API route: /api/build-transaction');
        const response = await fetch('/api/build-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            market_pair: market,
            direction,
            collateral,
            leverage,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          error = {
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            context: { body: errorData, status: response.status },
          };
        } else {
          data = await response.json();
        }
      } else {
        // Fallback: Use cloud Edge Function via Supabase client (if Next.js route unavailable)
        const result = await supabase.functions.invoke('build-transaction', {
          body: {
            user_id: userId,
            market_pair: market,
            direction,
            collateral,
            leverage,
          },
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ [BUILD] Edge Function error:', error);
        let errorMessage = error.message || 'Unknown error';
        if (error.context) {
          console.error('❌ [BUILD] Error context:', error.context);
          if (error.context.body) {
            try {
              const errorBody = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              errorMessage = errorBody.message || errorBody.error || errorMessage;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        throw new Error(errorMessage);
      }

      console.log('📥 [BUILD] Transaction built:', data);
      return data;
    } catch (error) {
      console.error('❌ [BUILD] Failed to build transaction:', error);
      throw error;
    }
  } else {
    throw new Error('Supabase not configured or user ID missing');
  }
}

/**
 * Execute a trade
 * @param {Object} trade - Trade parameters
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
    takeProfit = 100,
    stopLoss = null,
    userId,
  } = trade;

  // Try to execute via Edge Function if Supabase is configured
  if (isSupabaseConfigured() && userId) {
    try {
      console.log('🔄 [TRADE] Starting trade execution via Edge Function', {
        userId,
        newsId,
        market,
        direction,
        collateral,
        leverage,
      });

      // Check if we should use local Edge Function or custom proxy (development)
      const useLocalEdgeFunction = process.env.NEXT_PUBLIC_USE_LOCAL_EDGE_FUNCTIONS === 'true';
      const useCustomProxy = process.env.NEXT_PUBLIC_EDGE_FUNCTION_PROXY_URL;
      const localEdgeFunctionUrl = process.env.NEXT_PUBLIC_LOCAL_EDGE_FUNCTION_URL || 'http://localhost:54321';
      const customProxyUrl = useCustomProxy || null;
      
      let data, error;
      
      if (useCustomProxy) {
        // Use custom proxy URL (e.g., avantisfi.com)
        const proxyUrl = customProxyUrl.endsWith('/') ? customProxyUrl.slice(0, -1) : customProxyUrl;
        const edgeFunctionPath = '/functions/v1/execute-trade';
        const fullUrl = `${proxyUrl}${edgeFunctionPath}`;
        
        console.log('🔄 [TRADE] Using custom proxy:', fullUrl);
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            news_id: newsId,
            market_pair: market,
            direction,
            collateral,
            leverage,
            ...(trade.signedTransaction && { 
              signed_transaction: trade.signedTransaction,
              ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
              ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
              ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
            }),
            // If txHash is provided (external wallet already sent transaction), include it
            ...(trade.txHash && !trade.signedTransaction && { 
              tx_hash: trade.txHash,
              ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
              ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
              ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
            }),
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          error = {
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            context: { body: errorData, status: response.status },
          };
        } else {
          data = await response.json();
        }
      } else if (useLocalEdgeFunction) {
        // Call local Edge Function directly (no auth needed)
        console.log('🔄 [TRADE] Using local Edge Function:', `${localEdgeFunctionUrl}/functions/v1/execute-trade`);
        const requestBody = {
          user_id: userId,
          news_id: newsId,
          market_pair: market,
          direction,
          collateral,
          leverage,
          ...(trade.signedTransaction && { 
            signed_transaction: trade.signedTransaction,
            ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
            ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
            ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
          }),
          // If txHash is provided (external wallet already sent transaction), include it
          ...(trade.txHash && !trade.signedTransaction && { 
            tx_hash: trade.txHash,
            ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
            ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
            ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
          }),
        };
        const response = await fetch(`${localEdgeFunctionUrl}/functions/v1/execute-trade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          error = {
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            context: { body: errorData, status: response.status },
          };
        } else {
          data = await response.json();
        }
      } else {
        // Use cloud Edge Function via Supabase client
        const { getSupabase } = await import('./supabase');
        const supabase = getSupabase();
        
        if (supabase) {
          const result = await supabase.functions.invoke('execute-trade', {
            body: {
              user_id: userId,
              news_id: newsId,
              market_pair: market,
              direction,
              collateral,
              leverage,
              ...(trade.signedTransaction && { 
                signed_transaction: trade.signedTransaction,
                ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
                ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
                ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
              }),
              // If txHash is provided (external wallet already sent transaction), include it
              ...(trade.txHash && !trade.signedTransaction && { 
                tx_hash: trade.txHash,
                ...(trade.pairIndex !== undefined && { pair_index: trade.pairIndex }),
                ...(trade.tradeIndex !== undefined && { trade_index: trade.tradeIndex }),
                ...(trade.entryPrice !== undefined && { entry_price: trade.entryPrice }),
              }),
            },
          });
          data = result.data;
          error = result.error;
        } else {
          throw new Error('Supabase client not available');
        }
      }

      if (error) {
        console.error('❌ [TRADE] Edge Function error:', error);
        
        // Try to extract the actual error message from the response
        let errorMessage = error.message || 'Unknown error';
        
        // If error has a context or response, try to get more details
        if (error.context) {
          console.error('❌ [TRADE] Error context:', error.context);
          if (error.context.body) {
            try {
              const errorBody = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              errorMessage = errorBody.message || errorBody.error || errorMessage;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        
        // Create a more descriptive error
        const detailedError = new Error(errorMessage);
        detailedError.originalError = error;
        throw detailedError;
      }

      console.log('📥 [TRADE] Edge Function response:', data);

      if (data && data.success) {
        const tradeData = {
          id: data.trade_id,
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
          openedAt: new Date().toISOString(),
          status: 'active',
          pairIndex: data.pair_index,
          tradeIndex: data.trade_index,
          avantisTradeId: data.avantis_trade_id,
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
        console.warn('⚠️ [TRADE] Edge Function returned unsuccessful response:', data);
        throw new Error(data?.message || 'Trade execution failed');
      }
    } catch (error) {
      console.error('❌ [TRADE] Failed to execute trade via Edge Function:', error);
      console.error('📋 [TRADE] Error details:', {
        message: error.message,
        stack: error.stack,
        userId,
        market,
        direction,
      });
      throw error;
    }
  } else {
    const errorMsg = !isSupabaseConfigured() 
      ? 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      : 'User ID required. Please ensure you are logged in.';
    
    console.error('❌ [TRADE] Cannot execute trade:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Close a trade
 * @param {string} tradeId - Trade ID to close
 * @param {Object} trade - Trade object with current data
 * @returns {Promise<Object>} Close result
 */
export async function closeTrade(tradeId, trade) {
  console.log('🔄 [CLOSE] Starting trade close', {
    tradeId,
    market: trade.market,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    userId: trade.userId,
  });

  // Try to close via Edge Function if Supabase is configured
  if (isSupabaseConfigured() && trade.userId) {
    try {
      // Check if we should use local Edge Function or custom proxy (development)
      const useLocalEdgeFunction = process.env.NEXT_PUBLIC_USE_LOCAL_EDGE_FUNCTIONS === 'true';
      const useCustomProxy = process.env.NEXT_PUBLIC_EDGE_FUNCTION_PROXY_URL;
      const localEdgeFunctionUrl = process.env.NEXT_PUBLIC_LOCAL_EDGE_FUNCTION_URL || 'http://localhost:54321';
      const customProxyUrl = useCustomProxy || null;
      
      let data, error;
      
      if (useCustomProxy) {
        // Use custom proxy URL (e.g., avantisfi.com)
        const proxyUrl = customProxyUrl.endsWith('/') ? customProxyUrl.slice(0, -1) : customProxyUrl;
        const edgeFunctionPath = '/functions/v1/close-trade';
        const fullUrl = `${proxyUrl}${edgeFunctionPath}`;
        
        console.log('🔄 [CLOSE] Using custom proxy:', fullUrl);
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trade_id: tradeId,
            user_id: trade.userId,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          error = {
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            context: { body: errorData, status: response.status },
          };
        } else {
          data = await response.json();
        }
      } else if (useLocalEdgeFunction) {
        // Call local Edge Function directly (no auth needed)
        console.log('🔄 [CLOSE] Using local Edge Function:', `${localEdgeFunctionUrl}/functions/v1/close-trade`);
        const response = await fetch(`${localEdgeFunctionUrl}/functions/v1/close-trade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trade_id: tradeId,
            user_id: trade.userId,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          error = {
            message: errorData.message || errorData.error || `HTTP ${response.status}`,
            context: { body: errorData, status: response.status },
          };
        } else {
          data = await response.json();
        }
      } else {
        // Use cloud Edge Function via Supabase client
        const { getSupabase } = await import('./supabase');
        const supabase = getSupabase();
        
        if (supabase) {
          const result = await supabase.functions.invoke('close-trade', {
            body: {
              trade_id: tradeId,
              user_id: trade.userId,
            },
          });
          data = result.data;
          error = result.error;
        } else {
          throw new Error('Supabase client not available');
        }
      }

      if (error) {
        console.error('❌ [CLOSE] Edge Function error:', error);
        throw error;
      }

      console.log('📥 [CLOSE] Edge Function response:', data);

      if (data && data.success) {
        // Return closed trade in the format expected by the store
        if (!data.exit_price) {
          throw new Error('Exit price not provided by trading service');
        }
        
        const exitPrice = data.exit_price;
        
        // Calculate P&L if not provided
        let pnl = data.pnl;
        let pnlPercent = data.pnl_percent;
        
        if (pnl === null || pnl === undefined) {
          const priceChange = trade.direction === 'long'
            ? (exitPrice - trade.entryPrice) / trade.entryPrice
            : (trade.entryPrice - exitPrice) / trade.entryPrice;
          pnl = trade.collateral * trade.leverage * priceChange;
          pnlPercent = priceChange * trade.leverage * 100;
        }

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
        console.warn('⚠️ [CLOSE] Edge Function returned unsuccessful response:', data);
        throw new Error(data?.message || 'Trade close failed');
      }
    } catch (error) {
      console.error('❌ [CLOSE] Failed to close trade via Edge Function:', error);
      console.error('📋 [CLOSE] Error details:', {
        message: error.message,
        stack: error.stack,
        tradeId,
        userId: trade.userId,
      });
      throw error;
    }
  } else {
    const errorMsg = !isSupabaseConfigured() 
      ? 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      : 'User ID required. Please ensure you are logged in.';
    
    console.error('❌ [CLOSE] Cannot close trade:', errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Get current prices for markets
 * @param {Array<string>} markets - List of market pairs
 * @returns {Promise<Object>} Map of market to price
 */
export async function getPrices(markets) {
  // Simulate API call
  await delay(MOCK_DELAY / 2);

  const prices = {};
  for (const market of markets) {
    prices[market] = getMockPrice(market);
  }

  return prices;
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
  getPrices,
  getPortfolio,
  saveSettings,
};


