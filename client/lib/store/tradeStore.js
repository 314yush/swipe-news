import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Trade store for managing active and closed trades
 * Persists trade data to localStorage
 */
const useTradeStore = create(
  persist(
    (set, get) => ({
      // Trade state
      activeTrades: [],
      closedTrades: [],
      stats: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        bestTrade: null,
        worstTrade: null,
      },
      isExecuting: false,

      // Actions
      /**
       * Add a new trade
       * @param {Object} trade - Trade object
       */
      addTrade: (trade) => {
        const newTrade = {
          id: trade.id || `trade-${Date.now()}`,
          newsId: trade.newsId,
          newsHeadline: trade.newsHeadline,
          market: trade.market,
          direction: trade.direction, // 'long' | 'short'
          collateral: trade.collateral,
          leverage: trade.leverage || 75,
          entryPrice: trade.entryPrice,
          currentPrice: trade.entryPrice,
          takeProfit: trade.takeProfit || 200, // percentage
          stopLoss: trade.stopLoss || null,
          pnl: trade.pnl || 0,
          pnlPercent: trade.pnlPercent || 0,
          openedAt: trade.openedAt || new Date().toISOString(),
          status: 'active',
          // CRITICAL: Preserve pairIndex and tradeIndex for closing trades
          pairIndex: trade.pairIndex,
          tradeIndex: trade.tradeIndex,
          avantisTradeId: trade.avantisTradeId || trade.id,
          marketIsOpen: trade.marketIsOpen !== undefined ? trade.marketIsOpen : true,
        };

        set((state) => ({
          activeTrades: [newTrade, ...state.activeTrades],
        }));

        // Recalculate stats
        get().calculateStats();

        return newTrade;
      },

      /**
       * Close an active trade
       * @param {string} tradeId - ID of the trade to close
       * @param {number} exitPrice - Exit price
       */
      closeTrade: (tradeId, exitPrice) => {
        const { activeTrades } = get();
        const trade = activeTrades.find((t) => t.id === tradeId);

        if (!trade) return null;

        // Calculate final P&L
        // Calculate price change percentage
        const priceChange = trade.direction === 'long'
          ? (exitPrice - trade.entryPrice) / trade.entryPrice
          : (trade.entryPrice - exitPrice) / trade.entryPrice;
        
        // P&L calculation: Position Size × Price Change
        // Position Size = Original Collateral × Leverage
        // Use the original collateral (not current collateral which changes with P&L)
        const positionSize = trade.collateral * trade.leverage;
        const pnl = positionSize * priceChange;
        const pnlPercent = priceChange * trade.leverage * 100;

        const closedTrade = {
          ...trade,
          exitPrice,
          pnl,
          pnlPercent,
          closedAt: new Date().toISOString(),
          status: 'closed',
        };

        set((state) => ({
          activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
          closedTrades: [closedTrade, ...state.closedTrades],
        }));

        // Recalculate stats
        get().calculateStats();

        return closedTrade;
      },

      /**
       * Update P&L for an active trade (for real-time updates)
       * @param {string} tradeId - ID of the trade
       * @param {number} currentPrice - Current market price
       */
      updatePnL: (tradeId, currentPrice) => {
        set((state) => ({
          activeTrades: state.activeTrades.map((trade) => {
            if (trade.id !== tradeId) return trade;

            // Calculate price change percentage
            const priceChange = trade.direction === 'long'
              ? (currentPrice - trade.entryPrice) / trade.entryPrice
              : (trade.entryPrice - currentPrice) / trade.entryPrice;
            
            // P&L calculation: Position Size × Price Change
            // Position Size = Original Collateral × Leverage
            // Use the original collateral (not current collateral which changes with P&L)
            const positionSize = trade.collateral * trade.leverage;
            const pnl = positionSize * priceChange;
            const pnlPercent = priceChange * trade.leverage * 100;

            return {
              ...trade,
              currentPrice,
              pnl,
              pnlPercent,
            };
          }),
        }));
      },

      /**
       * Update all active trades with new prices
       * @param {Object} prices - Map of market to price { 'BTC/USD': 45000, ... }
       */
      updateAllPrices: (prices) => {
        set((state) => ({
          activeTrades: state.activeTrades.map((trade) => {
            // Don't update prices for closed markets
            if (trade.marketIsOpen === false) {
              return trade;
            }
            
            const currentPrice = prices[trade.market];
            if (!currentPrice) return trade;

            // Calculate price change percentage
            const priceChange = trade.direction === 'long'
              ? (currentPrice - trade.entryPrice) / trade.entryPrice
              : (trade.entryPrice - currentPrice) / trade.entryPrice;
            
            // P&L calculation: Position Size × Price Change
            // Position Size = Original Collateral × Leverage
            // Use the original collateral (not current collateral which changes with P&L)
            const positionSize = trade.collateral * trade.leverage;
            const pnl = positionSize * priceChange;
            const pnlPercent = priceChange * trade.leverage * 100;

            return {
              ...trade,
              currentPrice,
              pnl,
              pnlPercent,
            };
          }),
        }));
      },

      /**
       * Calculate trading statistics
       */
      calculateStats: () => {
        const { activeTrades, closedTrades } = get();
        const allTrades = [...activeTrades, ...closedTrades];
        const totalTrades = allTrades.length;

        if (totalTrades === 0) {
          set({
            stats: {
              totalTrades: 0,
              winRate: 0,
              totalPnL: 0,
              bestTrade: null,
              worstTrade: null,
            },
          });
          return;
        }

        // Calculate stats from closed trades only
        const completedTrades = closedTrades;
        const winningTrades = completedTrades.filter((t) => t.pnl > 0);
        const winRate = completedTrades.length > 0 
          ? (winningTrades.length / completedTrades.length) * 100 
          : 0;

        const totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0);

        // Find best and worst trades
        let bestTrade = null;
        let worstTrade = null;

        if (completedTrades.length > 0) {
          bestTrade = completedTrades.reduce((best, trade) => 
            trade.pnl > (best?.pnl || -Infinity) ? trade : best, null);
          worstTrade = completedTrades.reduce((worst, trade) => 
            trade.pnl < (worst?.pnl || Infinity) ? trade : worst, null);
        }

        set({
          stats: {
            totalTrades,
            winRate: Math.round(winRate * 10) / 10,
            totalPnL: Math.round(totalPnL * 100) / 100,
            bestTrade,
            worstTrade,
          },
        });
      },

      /**
       * Get trades filtered by profit/loss
       * @param {'all' | 'profitable' | 'loss'} filter
       */
      getFilteredClosedTrades: (filter = 'all') => {
        const { closedTrades } = get();
        
        switch (filter) {
          case 'profitable':
            return closedTrades.filter((t) => t.pnl > 0);
          case 'loss':
            return closedTrades.filter((t) => t.pnl <= 0);
          default:
            return closedTrades;
        }
      },

      setExecuting: (executing) => {
        set({ isExecuting: executing });
      },

      /**
       * Sync trades from Avantis SDK with the store
       * This merges Avantis trades with local trades, avoiding duplicates
       * @param {Array} avantisActiveTrades - Active trades from Avantis
       * @param {Array} avantisClosedTrades - Closed trades from Avantis
       */
      syncTradesFromAvantis: (avantisActiveTrades, avantisClosedTrades) => {
        set((state) => {
          // Create a map of existing trades by avantisTradeId
          const existingActiveMap = new Map(
            state.activeTrades
              .filter(t => t.avantisTradeId)
              .map(t => [t.avantisTradeId, t])
          );
          const existingClosedMap = new Map(
            state.closedTrades
              .filter(t => t.avantisTradeId)
              .map(t => [t.avantisTradeId, t])
          );

          // Merge Avantis active trades with local trades
          // Prefer Avantis data for trades that exist in both
          const mergedActiveTrades = [];
          const processedIds = new Set();

          // First, add/update trades from Avantis
          (avantisActiveTrades || []).forEach((avantisTrade) => {
            const id = avantisTrade.avantisTradeId || avantisTrade.id;
            processedIds.add(id);
            
            // DEBUG: Log trade data from Avantis
            if (avantisTrade.pairIndex === 0 || avantisTrade.tradeIndex === 0) {
              console.log('🔍 [STORE] Syncing trade with index 0:', {
                id,
                pairIndex: avantisTrade.pairIndex,
                tradeIndex: avantisTrade.tradeIndex,
                pairIndex_undefined: avantisTrade.pairIndex === undefined,
                pairIndex_null: avantisTrade.pairIndex === null,
                tradeIndex_undefined: avantisTrade.tradeIndex === undefined,
                tradeIndex_null: avantisTrade.tradeIndex === null,
                market: avantisTrade.market,
              });
            }
            
            const existing = existingActiveMap.get(id);
            if (existing) {
              // Merge: keep local fields like newsId/newsHeadline, update with Avantis data
              // CRITICAL: Preserve pairIndex and tradeIndex from Avantis (needed for closing trades)
              // IMPORTANT: 0 is a valid value! Use !== undefined check, not truthy check
              const finalPairIndex = (avantisTrade.pairIndex !== undefined && avantisTrade.pairIndex !== null) 
                ? avantisTrade.pairIndex 
                : existing.pairIndex;
              const finalTradeIndex = (avantisTrade.tradeIndex !== undefined && avantisTrade.tradeIndex !== null)
                ? avantisTrade.tradeIndex
                : existing.tradeIndex;
              
              // Use actual timestamp from Avantis (real trade opening time) if available
              const finalOpenedAt = avantisTrade.openedAt || existing.openedAt;
              
              // DEBUG: Log merge result
              if (finalPairIndex === 0 || finalTradeIndex === 0) {
                console.log('🔍 [STORE] Merged trade with index 0:', {
                  id,
                  finalPairIndex,
                  finalTradeIndex,
                  avantis_pairIndex: avantisTrade.pairIndex,
                  existing_pairIndex: existing.pairIndex,
                });
              }
              
              mergedActiveTrades.push({
                ...existing,
                ...avantisTrade,
                newsId: existing.newsId || avantisTrade.newsId,
                newsHeadline: existing.newsHeadline || avantisTrade.newsHeadline,
                // Ensure pairIndex and tradeIndex are preserved from Avantis
                pairIndex: finalPairIndex,
                tradeIndex: finalTradeIndex,
                // Use actual timestamp from Avantis (real trade opening time)
                openedAt: finalOpenedAt,
              });
            } else {
              // New trade from Avantis - ensure pairIndex and tradeIndex are included
              mergedActiveTrades.push({
                ...avantisTrade,
                pairIndex: avantisTrade.pairIndex,
                tradeIndex: avantisTrade.tradeIndex,
              });
            }
          });

          // Then, add local-only active trades (not in Avantis)
          // But first, try to match them with Avantis trades by market/direction/entryPrice
          state.activeTrades.forEach((localTrade) => {
            const id = localTrade.avantisTradeId || localTrade.id;
            if (!processedIds.has(id) && !existingClosedMap.has(id)) {
              // Try to find a matching Avantis trade by market, direction, and similar entryPrice
              // This helps update trades that were added before we started preserving avantisTradeId
              if (!localTrade.pairIndex || !localTrade.tradeIndex) {
                const matchingAvantisTrade = (avantisActiveTrades || []).find((at) => {
                  const marketMatch = at.market === localTrade.market;
                  const directionMatch = at.direction === localTrade.direction;
                  const priceMatch = Math.abs((at.entryPrice || 0) - (localTrade.entryPrice || 0)) < 0.01; // Within 1 cent
                  return marketMatch && directionMatch && priceMatch && at.pairIndex !== undefined && at.tradeIndex !== undefined;
                });
                
                if (matchingAvantisTrade) {
                  // Update local trade with Avantis data
                  mergedActiveTrades.push({
                    ...localTrade,
                    ...matchingAvantisTrade,
                    newsId: localTrade.newsId || matchingAvantisTrade.newsId,
                    newsHeadline: localTrade.newsHeadline || matchingAvantisTrade.newsHeadline,
                    pairIndex: matchingAvantisTrade.pairIndex,
                    tradeIndex: matchingAvantisTrade.tradeIndex,
                    avantisTradeId: matchingAvantisTrade.avantisTradeId || matchingAvantisTrade.id,
                  });
                  return; // Skip adding the original trade
                }
              }
              
              // No match found, add as-is
              mergedActiveTrades.push(localTrade);
            }
          });

          // Merge closed trades similarly
          const mergedClosedTrades = [];
          const processedClosedIds = new Set();

          (avantisClosedTrades || []).forEach((avantisTrade) => {
            const id = avantisTrade.avantisTradeId || avantisTrade.id;
            processedClosedIds.add(id);
            
            const existing = existingClosedMap.get(id);
            if (existing) {
              mergedClosedTrades.push({
                ...existing,
                ...avantisTrade,
                newsId: existing.newsId || avantisTrade.newsId,
                newsHeadline: existing.newsHeadline || avantisTrade.newsHeadline,
              });
            } else {
              mergedClosedTrades.push(avantisTrade);
            }
          });

          // Add local-only closed trades
          state.closedTrades.forEach((localTrade) => {
            const id = localTrade.avantisTradeId || localTrade.id;
            if (!processedClosedIds.has(id)) {
              mergedClosedTrades.push(localTrade);
            }
          });

          // Remove any active trades that are now closed in Avantis
          const closedIds = new Set(mergedClosedTrades.map(t => t.avantisTradeId || t.id));
          const filteredActive = mergedActiveTrades.filter(
            t => !closedIds.has(t.avantisTradeId || t.id)
          );
          
          // IMPORTANT: If a trade was in our active list but is no longer in Avantis's active list,
          // and it's not in the closed list either, it was likely closed externally.
          // Move it to closed with a status update.
          const avantisActiveIds = new Set(
            (avantisActiveTrades || []).map(t => t.avantisTradeId || t.id)
          );
          const avantisClosedIds = new Set(
            (avantisClosedTrades || []).map(t => t.avantisTradeId || t.id)
          );
          
          // Find local active trades that are no longer in Avantis (closed externally)
          const externallyClosedTrades = [];
          state.activeTrades.forEach((localTrade) => {
            const id = localTrade.avantisTradeId || localTrade.id;
            
            // DEBUG: Log all local active trades to see what we're checking
            console.log('🔍 [STORE] Checking local active trade:', {
              id,
              market: localTrade.market,
              avantisTradeId: localTrade.avantisTradeId,
              has_avantisTradeId: !!localTrade.avantisTradeId,
              in_avantis_active: avantisActiveIds.has(id),
              in_avantis_closed: avantisClosedIds.has(id),
            });
            
            // If trade is not in Avantis active list and not in Avantis closed list,
            // but we have it as active, it was likely closed externally
            if (!avantisActiveIds.has(id) && !avantisClosedIds.has(id)) {
              // Try multiple matching strategies to determine if trade should be closed
              let shouldClose = false;
              let closeReason = '';
              
              // Strategy 1: Has avantisTradeId - definitely close it
              if (localTrade.avantisTradeId) {
                shouldClose = true;
                closeReason = 'has avantisTradeId but not in Avantis';
              } 
              // Strategy 2: Has pairIndex/tradeIndex - check if any Avantis trade matches
              else if (localTrade.pairIndex !== undefined && localTrade.tradeIndex !== undefined) {
                const matchingAvantisTrade = [...(avantisActiveTrades || []), ...(avantisClosedTrades || [])].find(
                  at => at.pairIndex === localTrade.pairIndex && at.tradeIndex === localTrade.tradeIndex
                );
                
                if (!matchingAvantisTrade) {
                  // No matching trade found in Avantis - it was closed externally
                  shouldClose = true;
                  closeReason = 'matched by pairIndex/tradeIndex but not found in Avantis';
                }
              }
              // Strategy 3: Match by market name and direction (fallback for old trades)
              else if (localTrade.market) {
                // Check if any Avantis trade matches market and direction
                const matchingAvantisTrade = [...(avantisActiveTrades || []), ...(avantisClosedTrades || [])].find(
                  at => at.market === localTrade.market && 
                       at.direction === localTrade.direction &&
                       Math.abs((at.entryPrice || 0) - (localTrade.entryPrice || 0)) < 1.0 // Within $1 tolerance
                );
                
                if (!matchingAvantisTrade) {
                  // No matching trade found in Avantis - it was closed externally
                  shouldClose = true;
                  closeReason = 'matched by market/direction/price but not found in Avantis';
                }
              }
              // Strategy 4: If trade has been in our active list but never synced from Avantis,
              // and it's not in Avantis response, close it (might be a stale trade)
              else {
                // Very aggressive: if we have no identifiers and it's not in Avantis, close it
                // This handles edge cases where trades were added locally but never synced
                shouldClose = true;
                closeReason = 'no identifiers and not in Avantis response';
              }
              
              if (shouldClose) {
                console.log('🔄 [STORE] Trade closed externally, moving to closed:', {
                  id,
                  market: localTrade.market,
                  avantisTradeId: localTrade.avantisTradeId,
                  pairIndex: localTrade.pairIndex,
                  tradeIndex: localTrade.tradeIndex,
                  reason: closeReason,
                });
                externallyClosedTrades.push({
                  ...localTrade,
                  status: 'closed',
                  closedAt: new Date().toISOString(),
                });
              }
            }
          });
          
          // Add externally closed trades to closed list
          if (externallyClosedTrades.length > 0) {
            console.log(`🔄 [STORE] Moving ${externallyClosedTrades.length} externally closed trades to closed list`);
            externallyClosedTrades.forEach(trade => {
              const id = trade.avantisTradeId || trade.id;
              if (!closedIds.has(id)) {
                mergedClosedTrades.push(trade);
                closedIds.add(id);
                console.log(`✅ [STORE] Moved to closed: ${trade.market} (${id})`);
              } else {
                console.log(`⚠️ [STORE] Trade already in closed list: ${trade.market} (${id})`);
              }
            });
            
            // Remove externally closed trades from active list
            const finalFilteredActive = filteredActive.filter(
              t => {
                const tradeId = t.avantisTradeId || t.id;
                const shouldKeep = !closedIds.has(tradeId);
                if (!shouldKeep) {
                  console.log(`🗑️ [STORE] Removing from active: ${t.market} (${tradeId})`);
                }
                return shouldKeep;
              }
            );
            
            console.log(`📊 [STORE] Final counts: ${finalFilteredActive.length} active, ${mergedClosedTrades.length} closed`);
            
            return {
              activeTrades: finalFilteredActive,
              closedTrades: mergedClosedTrades,
            };
          }

          return {
            activeTrades: filteredActive,
            closedTrades: mergedClosedTrades,
          };
        });

        // Recalculate stats after syncing
        get().calculateStats();
      },

      // Reset store to initial state
      reset: () => {
        set({
          activeTrades: [],
          closedTrades: [],
          stats: {
            totalTrades: 0,
            winRate: 0,
            totalPnL: 0,
            bestTrade: null,
            worstTrade: null,
          },
          isExecuting: false,
        });
      },
    }),
    {
      name: 'swipetrader-trade-storage',
      // Persist all trade data
      partialize: (state) => ({
        activeTrades: state.activeTrades,
        closedTrades: state.closedTrades,
        stats: state.stats,
      }),
    }
  )
);

// Export getState function for accessing store outside of React components
export const getTradeStoreState = () => useTradeStore.getState();

export default useTradeStore;



