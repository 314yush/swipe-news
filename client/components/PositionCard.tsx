"use client";

import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import {
  formatCurrency,
  formatPrice,
  formatPercent,
  formatRelativeTime,
  truncateText,
  formatMarket,
} from "@/lib/utils/formatters";

/**
 * M3 PositionCard component
 * 
 * Replaces: Custom position card with Tailwind styling
 * M3 Component: Card with CardContent, Chip, Button
 * Why: M3 Card provides proper elevation and structure,
 *      Chip for direction badges, Button for actions
 * Styles: Surface container color, success/error for P&L
 */

interface Trade {
  id: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
  collateral: number;
  leverage: number;
  entryPrice: number;
  currentPrice?: number;
  exitPrice?: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  closedAt?: string;
}

interface PositionCardProps {
  trade: Trade;
  onClose?: (id: string) => void;
  isClosing?: boolean;
}

export default function PositionCard({
  trade,
  onClose,
  isClosing = false,
}: PositionCardProps) {
  const {
    id,
    newsHeadline,
    market,
    direction,
    collateral,
    leverage,
    entryPrice,
    currentPrice,
    pnl,
    pnlPercent,
    openedAt,
  } = trade;

  const isLong = direction === "long";
  const isProfit = pnl >= 0;

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Direction badge */}
            <Chip
              icon={isLong ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={isLong ? "LONG" : "SHORT"}
              size="small"
              color={isLong ? "success" : "error"}
              sx={{
                fontWeight: 600,
                "& .MuiChip-icon": {
                  fontSize: 16,
                },
              }}
            />

            {/* Market */}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatMarket(market)}
            </Typography>
          </Box>

          {/* Time */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            <AccessTimeIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption">{formatRelativeTime(openedAt)}</Typography>
          </Box>
        </Box>

        {/* News headline */}
        <Typography
          variant="body2"
          sx={{
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncateText(newsHeadline, 80)}
        </Typography>

        {/* Price info */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Entry Price
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatPrice(entryPrice)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">
              Current Price
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatPrice(currentPrice || entryPrice)}
            </Typography>
          </Box>
        </Box>

        {/* Trade details */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Collateral: {formatCurrency(collateral)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Leverage: {leverage}x
          </Typography>
        </Box>

        {/* P&L and Close button */}
        <Divider sx={{ mb: 1.5 }} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Unrealized P&L
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: isProfit ? "success.main" : "error.main",
              }}
            >
              {pnl >= 0 ? "+" : ""}
              {formatCurrency(pnl)}
              <Typography
                component="span"
                variant="body2"
                sx={{
                  fontWeight: 500,
                  ml: 0.5,
                  color: isProfit ? "success.main" : "error.main",
                }}
              >
                ({formatPercent(pnlPercent)})
              </Typography>
            </Typography>
          </Box>

          {onClose && (
            <Button
              onClick={() => onClose(id)}
              disabled={isClosing}
              variant="outlined"
              color="error"
              size="small"
              startIcon={
                isClosing ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloseIcon />
                )
              }
              sx={{ minWidth: 80 }}
            >
              {isClosing ? "Closing" : "Close"}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

interface ClosedPositionCardProps {
  trade: Trade;
}

export function ClosedPositionCard({ trade }: ClosedPositionCardProps) {
  const {
    newsHeadline,
    market,
    direction,
    entryPrice,
    exitPrice,
    pnl,
    openedAt,
    closedAt,
  } = trade;

  const isLong = direction === "long";
  const isProfit = pnl >= 0;

  return (
    <Card sx={{ opacity: 0.8 }}>
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Direction badge */}
            <Chip
              icon={isLong ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={isLong ? "LONG" : "SHORT"}
              size="small"
              color={isLong ? "success" : "error"}
              variant="outlined"
              sx={{
                fontWeight: 600,
                "& .MuiChip-icon": {
                  fontSize: 16,
                },
              }}
            />

            {/* Market */}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatMarket(market)}
            </Typography>
          </Box>

          {/* Closed indicator */}
          <Chip
            label="Closed"
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.75rem" }}
          />
        </Box>

        {/* News headline */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncateText(newsHeadline, 60)}
        </Typography>

        {/* Price info */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Entry
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatPrice(entryPrice)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              Exit
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatPrice(exitPrice || entryPrice)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">
              P&L
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: "bold",
                color: isProfit ? "success.main" : "error.main",
              }}
            >
              {pnl >= 0 ? "+" : ""}
              {formatCurrency(pnl)}
            </Typography>
          </Box>
        </Box>

        {/* Time info */}
        <Divider sx={{ mb: 1 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Opened: {formatRelativeTime(openedAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Closed: {formatRelativeTime(closedAt || openedAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}



