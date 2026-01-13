"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BottomNav from "@/components/BottomNav";
import StatsCard from "@/components/StatsCard";
import PositionCard from "@/components/PositionCard";
import TradeHistory from "@/components/TradeHistory";
import { ToastProvider, useToast } from "@/components/Toast";
import { PositionCardSkeleton, StatsCardSkeleton } from "@/components/Skeleton";
import useTradeStore from "@/lib/store/tradeStore";
import { closeTrade as closeTradeApi, getTrades, getPrices } from "@/lib/services/api";
import type { Trade } from "@/lib/types";
import { Grid } from "@mui/material";

/**
 * Portfolio Page - Trading positions and history
 * 
 * M3 Components Used:
 * - AppBar: M3 top app bar with title
 * - Tabs: M3 tabs for switching between active/history
 * - Card: M3 cards for stats and positions
 * - Avatar: M3 avatar for empty states
 * - Button: M3 buttons for actions
 */

type TabType = "active" | "history";

function PortfolioPage() {
  const { authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const toast = useToast();
  const {
    activeTrades,
    closedTrades,
    stats,
    closeTrade,
    setExecuting,
    isExecuting,
    calculateStats,
    updateAllPrices,
    syncTradesFromAvantis,
  } = useTradeStore();

  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trades from Python service on mount and periodically
  useEffect(() => {
    if (!authenticated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTrades = async () => {
      if (!isMounted) return;

      try {
        // Get wallet address (can be embedded or external wallet)
        const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
        const externalWallet = wallets.find((w) => w.walletClientType !== 'privy');
        const walletAddress = embeddedWallet?.address || externalWallet?.address || user?.wallet?.address;
        const privyUserId = user?.id;

        if (!walletAddress || !privyUserId) {
          console.warn('Portfolio: Wallet address or Privy user ID not available');
          if (isMounted) setIsLoading(false);
          return;
        }

        console.log('🔄 [Portfolio] Fetching trades from Python service...');
        const result = await getTrades({
          privy_user_id: privyUserId,
          wallet_address: walletAddress,
        }) as { 
          success: boolean; 
          trades?: any[]; 
          activeTrades?: any[];
          closedTrades?: any[];
          pending_orders?: number;
        };

        if (result.success && isMounted) {
          // Sync trades from Avantis SDK with the store
          syncTradesFromAvantis(result.activeTrades || [], result.closedTrades || []);
          
          console.log(`📥 [Portfolio] Synced trades from Avantis SDK:`, {
            total: result.trades?.length || 0,
            active: result.activeTrades?.length || 0,
            closed: result.closedTrades?.length || 0,
            pending_orders: result.pending_orders || 0,
          });
        }
      } catch (error) {
        console.error('❌ [Portfolio] Failed to fetch trades:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchTrades();

    // Refresh trades every 30 seconds to catch any changes
    const interval = setInterval(fetchTrades, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authenticated, user, wallets, syncTradesFromAvantis]);

  // Poll prices for active trades with adaptive interval
  useEffect(() => {
    if (!authenticated || !user || activeTrades.length === 0) {
      return;
    }

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const updatePrices = async () => {
      if (!isMounted) return;

      try {
        // Get unique markets from active trades, filter out:
        // - "Pair-X" placeholders
        // - Closed markets (marketIsOpen === false)
        const marketList: string[] = activeTrades
          .filter((trade: Trade) => {
            // Only include trades where market is open
            return trade.marketIsOpen !== false;
          })
          .map((trade: Trade) => trade.market)
          .filter((market: string | undefined): market is string => 
            typeof market === 'string' && market !== '' && !market.startsWith('Pair-') && market !== 'Unknown'
          );
        const markets: string[] = Array.from(new Set(marketList));
        
        if (markets.length === 0) {
          // No open markets to update - this is fine, just skip
          return;
        }

        // Fetch current prices (with caching built-in)
        const prices = await getPrices(markets);
        
        // Update P&L for all active trades (only for open markets)
        if (Object.keys(prices).length > 0 && isMounted) {
          updateAllPrices(prices);
          retryCount = 0; // Reset retry count on success
        } else {
          console.warn('⚠️ [Portfolio] No prices received for markets:', markets);
        }
      } catch (error) {
        console.error('❌ [Portfolio] Failed to update prices:', error);
        retryCount++;
        
        // If too many failures, increase interval
        if (retryCount >= MAX_RETRIES) {
          console.warn('⚠️ [Portfolio] Too many price update failures, slowing down polling');
        }
      }
    };

    // Update immediately
    updatePrices();

    // Adaptive polling: 5 seconds normally, 15 seconds if many failures
    const interval = setInterval(updatePrices, retryCount >= MAX_RETRIES ? 15000 : 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authenticated, user, activeTrades, updateAllPrices]);

  // Use store trades only (no mock fallback)
  const displayActiveTrades = activeTrades;
  const displayClosedTrades = closedTrades;
  const displayStats = stats;

  // Handle close trade
  const handleCloseTrade = async (tradeId: string) => {
    const trade = displayActiveTrades.find((t: { id: string }) => t.id === tradeId);
    if (!trade) return;

    setClosingTradeId(tradeId);

    try {
      // Get wallet address and Privy user ID
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const externalWallet = wallets.find((w) => w.walletClientType !== 'privy');
      const walletAddress = embeddedWallet?.address || externalWallet?.address || user?.wallet?.address;
      const privyUserId = user?.id;

      if (!walletAddress || !privyUserId) {
        throw new Error('Wallet address or Privy user ID not available');
      }

      // Debug: Log the trade object to see what we have
      console.log('🔍 [Portfolio] Trade object before close attempt:', {
        id: trade.id,
        pairIndex: trade.pairIndex,
        tradeIndex: trade.tradeIndex,
        pairIndex_type: typeof trade.pairIndex,
        tradeIndex_type: typeof trade.tradeIndex,
        pairIndex_undefined: trade.pairIndex === undefined,
        pairIndex_null: trade.pairIndex === null,
        tradeIndex_undefined: trade.tradeIndex === undefined,
        tradeIndex_null: trade.tradeIndex === null,
        market: trade.market,
        full_trade: trade,
      });
      
      // Ensure trade has required Avantis parameters
      // If missing, try to refresh from Avantis first
      // IMPORTANT: 0 is a valid index! Check for undefined/null, not falsy
      if (trade.pairIndex === undefined || trade.tradeIndex === undefined || trade.pairIndex === null || trade.tradeIndex === null) {
        console.warn('⚠️ [Portfolio] Trade missing pairIndex/tradeIndex, attempting to refresh from Avantis...', {
          pairIndex: trade.pairIndex,
          tradeIndex: trade.tradeIndex,
        });
        
        // Try to refresh trades from Avantis to get the missing data
        try {
          if (walletAddress && privyUserId) {
            const refreshResult = await getTrades({
              privy_user_id: privyUserId,
              wallet_address: walletAddress,
            }) as { 
              success: boolean; 
              activeTrades?: any[];
            };
            
            if (refreshResult.success && refreshResult.activeTrades) {
              // Sync to update the trade with missing fields
              syncTradesFromAvantis(refreshResult.activeTrades || [], []);
              
              // Get updated trade from store after sync
              const { activeTrades: updatedActiveTrades } = useTradeStore.getState();
              const updatedTrade = updatedActiveTrades.find((t: Trade) => t.id === tradeId);
              
              if (updatedTrade && updatedTrade.pairIndex !== undefined && updatedTrade.tradeIndex !== undefined) {
                // Use the updated trade with proper indices - retry the close
                console.log('✅ [Portfolio] Trade updated with pairIndex/tradeIndex, retrying close...');
                // Recursively call handleCloseTrade with the updated trade
                // But we'll just proceed with the updated trade directly
                const result = (await closeTradeApi(tradeId, {
                  ...updatedTrade,
                  privy_user_id: privyUserId,
                  wallet_address: walletAddress,
                })) as {
                  success: boolean;
                  trade: { exitPrice: number; pnl: number; pnlPercent: number; txHash?: string };
                };
                
                if (result.success) {
                  const tradeData = result.trade;
                  closeTrade(tradeId, tradeData.exitPrice);
                  
                  const txHash = tradeData.txHash;
                  const pnl = tradeData.pnl;
                  const pnlPercent = tradeData.pnlPercent || 0;
                  
                  toast.success(
                    `Position closed! P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
                    { 
                      duration: 5000,
                      description: txHash ? `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}` : undefined
                    }
                  );
                  setClosingTradeId(null);
                  return;
                }
              } else {
                console.warn('⚠️ [Portfolio] Trade still missing pairIndex/tradeIndex after refresh');
              }
            }
          }
        } catch (refreshError) {
          console.error('❌ [Portfolio] Failed to refresh trade from Avantis:', refreshError);
        }
        
        // If refresh didn't work, show helpful error
        toast.error(
          'Unable to close trade: Missing position data. The trade may not exist on-chain. Please refresh the page.',
          { duration: 5000 }
        );
        setClosingTradeId(null);
        throw new Error('Trade missing pairIndex or tradeIndex. Please refresh the page to sync trades from Avantis.');
      }

      const result = (await closeTradeApi(tradeId, {
        ...trade,
        privy_user_id: privyUserId,
        wallet_address: walletAddress,
      })) as {
        success: boolean;
        trade: { exitPrice: number; pnl: number; pnlPercent: number; txHash?: string };
      };

      if (result.success) {
        const tradeData = result.trade;
        closeTrade(tradeId, tradeData.exitPrice);
        
        // Show detailed success notification
        const txHash = tradeData.txHash;
        const pnl = tradeData.pnl;
        const pnlPercent = tradeData.pnlPercent || 0;
        
        toast.success(
          `Position closed! P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
          { 
            duration: 5000,
            description: txHash ? `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}` : undefined
          }
        );
        console.log('✅ [UI] Close notification shown:', {
          tradeId,
          market: trade.market,
          pnl,
          pnlPercent,
          txHash,
        });
      }
    } catch (error) {
      console.error('❌ [UI] Close trade failed:', error);
      toast.error("Failed to close position. Please try again.");
    } finally {
      setClosingTradeId(null);
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabType) => {
    setActiveTab(newValue);
  };

  // Check if user has wallet (authenticated or guest)
  const hasWallet = user?.wallet?.address || authenticated;

  // Not authenticated and no guest wallet
  if (!hasWallet) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          pb: "100px",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: 3,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "action.hover",
              mb: 2,
            }}
          >
            <LockIcon sx={{ fontSize: 32, color: "text.secondary" }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
            Connect to view portfolio
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Connect your wallet or continue as guest to view your positions and
            trade history
          </Typography>
          <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 320 }}>
            <Button variant="contained" onClick={login} sx={{ py: 1.5 }}>
              Connect Wallet
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await login();
                } catch (error) {
                  console.error("Failed to create guest session:", error);
                }
              }}
              sx={{ py: 1.5 }}
            >
              Continue as Guest (Testing)
            </Button>
          </Stack>
        </Box>
        <BottomNav />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        pb: "100px",
      }}
    >
      {/* Header - M3 AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          pt: "env(safe-area-inset-top)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
            Portfolio
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Stats */}
      <Box sx={{ px: 2, py: 2 }}>
        {isLoading ? (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <StatsCardSkeleton />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <StatsCardSkeleton />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <StatsCardSkeleton />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <StatsCardSkeleton />
            </Grid>
          </Grid>
        ) : (
          <StatsCard stats={displayStats} />
        )}
      </Box>

      {/* Tabs - M3 Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
        }}
      >
        <Tab
          value="active"
          label={`Active (${displayActiveTrades.length})`}
          sx={{ fontWeight: 500, textTransform: "none" }}
        />
        <Tab
          value="history"
          label={`History (${displayClosedTrades.length})`}
          sx={{ fontWeight: 500, textTransform: "none" }}
        />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
        {isLoading ? (
          <Stack spacing={1.5}>
            <PositionCardSkeleton />
            <PositionCardSkeleton />
          </Stack>
        ) : activeTab === "active" ? (
          // Active positions
          displayActiveTrades.length === 0 ? (
            <EmptyState
              icon={<ShowChartIcon sx={{ fontSize: 32 }} />}
              title="No open positions yet"
              description="Start swiping to open trades!"
            />
          ) : (
            <Stack spacing={1.5}>
              {displayActiveTrades.map((trade: Trade) => (
                <PositionCard
                  key={trade.id}
                  trade={trade}
                  onClose={handleCloseTrade}
                  isClosing={closingTradeId === trade.id}
                />
              ))}
            </Stack>
          )
        ) : (
          // Trade history
          <TradeHistory trades={displayClosedTrades} />
        )}
      </Box>

      {/* Bottom navigation */}
      <BottomNav />
    </Box>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        textAlign: "center",
      }}
    >
      <Avatar
        sx={{
          width: 64,
          height: 64,
          bgcolor: "action.hover",
          mb: 2,
        }}
      >
        {icon}
      </Avatar>
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

export default function Portfolio() {
  return (
    <ToastProvider>
      <PortfolioPage />
    </ToastProvider>
  );
}
