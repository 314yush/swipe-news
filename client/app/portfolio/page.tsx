"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
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
import { closeTrade as closeTradeApi } from "@/lib/services/api";
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
  const toast = useToast();
  const {
    activeTrades,
    closedTrades,
    stats,
    closeTrade,
    setExecuting,
    isExecuting,
    calculateStats,
  } = useTradeStore();

  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with mock data if empty
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
      // Get user ID from Supabase if available
      let userId = null;
      if (user?.id) {
        try {
          const { getUserIdByPrivyId } = await import('@/lib/services/supabase');
          userId = await getUserIdByPrivyId(user.id);
        } catch (error) {
          console.warn('Failed to get user ID from Supabase:', error);
        }
      }

      const result = (await closeTradeApi(tradeId, { ...trade, userId })) as {
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
