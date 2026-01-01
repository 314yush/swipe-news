"use client";

import { Card, CardContent, Box, Typography, Grid } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";

/**
 * M3 StatsCard component
 * 
 * Replaces: Custom stats grid with Tailwind cards
 * M3 Component: Card with CardContent in Grid layout
 * Why: M3 Cards provide proper elevation and surface colors
 * Styles: Surface container color, M3 typography scales
 */

interface Stats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  bestTrade?: {
    pnl: number;
  } | null;
  worstTrade?: {
    pnl: number;
  } | null;
}

interface StatsCardProps {
  stats: Stats | null;
}

export default function StatsCard({ stats }: StatsCardProps) {
  const { totalTrades, winRate, totalPnL, bestTrade } = stats || {};

  return (
    <Grid container spacing={1.5}>
      {/* Total Trades */}
      <Grid size={{ xs: 6 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <ShowChartIcon sx={{ fontSize: 18, color: "primary.main" }} />
              <Typography variant="caption" color="text.secondary">
                Total Trades
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              {totalTrades || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Win Rate */}
      <Grid size={{ xs: 6 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <EmojiEventsIcon sx={{ fontSize: 18, color: "warning.main" }} />
              <Typography variant="caption" color="text.secondary">
                Win Rate
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              {formatPercent(winRate || 0, 1).replace("+", "")}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Total P&L */}
      <Grid size={{ xs: 6 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {(totalPnL || 0) >= 0 ? (
                <TrendingUpIcon sx={{ fontSize: 18, color: "success.main" }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 18, color: "error.main" }} />
              )}
              <Typography variant="caption" color="text.secondary">
                Total P&L
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: (totalPnL || 0) >= 0 ? "success.main" : "error.main",
              }}
            >
              {(totalPnL || 0) >= 0 ? "+" : ""}
              {formatCurrency(totalPnL || 0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Best Trade */}
      <Grid size={{ xs: 6 }}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 18, color: "success.main" }} />
              <Typography variant="caption" color="text.secondary">
                Best Trade
              </Typography>
            </Box>
            {bestTrade ? (
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "success.main" }}
              >
                +{formatCurrency(bestTrade.pnl)}
              </Typography>
            ) : (
              <Typography variant="h6" color="text.secondary">
                —
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "error" | "warning" | "info";
}

export function StatItem({ label, value, icon, color = "primary" }: StatItemProps) {
  const colorMap = {
    primary: "primary.main",
    success: "success.main",
    error: "error.main",
    warning: "warning.main",
    info: "info.main",
  };

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          {icon && (
            <Box sx={{ color: colorMap[color], display: "flex" }}>{icon}</Box>
          )}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}



