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
          takeProfit: trade.takeProfit || 100, // percentage
          stopLoss: trade.stopLoss || null,
          pnl: 0,
          pnlPercent: 0,
          openedAt: trade.openedAt || new Date().toISOString(),
          status: 'active',
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
        const priceChange = trade.direction === 'long'
          ? (exitPrice - trade.entryPrice) / trade.entryPrice
          : (trade.entryPrice - exitPrice) / trade.entryPrice;
        
        const pnl = trade.collateral * trade.leverage * priceChange;
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

            const priceChange = trade.direction === 'long'
              ? (currentPrice - trade.entryPrice) / trade.entryPrice
              : (trade.entryPrice - currentPrice) / trade.entryPrice;
            
            const pnl = trade.collateral * trade.leverage * priceChange;
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
            const currentPrice = prices[trade.market];
            if (!currentPrice) return trade;

            const priceChange = trade.direction === 'long'
              ? (currentPrice - trade.entryPrice) / trade.entryPrice
              : (trade.entryPrice - currentPrice) / trade.entryPrice;
            
            const pnl = trade.collateral * trade.leverage * priceChange;
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

export default useTradeStore;



