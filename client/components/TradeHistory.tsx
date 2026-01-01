"use client";

import { useState } from "react";
import { Box, Chip, Typography, Avatar, Stack } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { ClosedPositionCard } from "./PositionCard";

/**
 * M3 TradeHistory component
 * 
 * Replaces: Custom trade history with Tailwind buttons and cards
 * M3 Component: Chip for filter tabs, ClosedPositionCard for items
 * Why: M3 Chips work well as filter toggles with clear active states
 * Styles: Primary color for active filter, grouped by date
 */

interface Trade {
  id: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
  collateral: number;
  leverage: number;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  closedAt?: string;
}

interface TradeHistoryProps {
  trades?: Trade[];
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "profitable", label: "Profitable" },
  { id: "loss", label: "Loss" },
] as const;

type FilterType = typeof FILTERS[number]["id"];

export default function TradeHistory({ trades = [] }: TradeHistoryProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    switch (filter) {
      case "profitable":
        return trade.pnl > 0;
      case "loss":
        return trade.pnl <= 0;
      default:
        return true;
    }
  });

  // Group trades by date
  const groupedTrades = filteredTrades.reduce<Record<string, Trade[]>>(
    (groups, trade) => {
      const date = new Date(trade.closedAt || trade.openedAt).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(trade);
      return groups;
    },
    {}
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Filter chips */}
      <Stack direction="row" spacing={1}>
        {FILTERS.map(({ id, label }) => (
          <Chip
            key={id}
            label={label}
            onClick={() => setFilter(id)}
            color={filter === id ? "primary" : "default"}
            variant={filter === id ? "filled" : "outlined"}
            sx={{
              fontWeight: 500,
              "&:hover": {
                bgcolor: filter === id ? "primary.main" : "action.hover",
              },
            }}
          />
        ))}
      </Stack>

      {/* Trade list */}
      {filteredTrades.length === 0 ? (
        <EmptyHistory filter={filter} />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Object.entries(groupedTrades).map(([date, dateTrades]) => (
            <Box key={date}>
              {/* Date header */}
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "block", mb: 1, px: 0.5 }}
              >
                {date}
              </Typography>

              {/* Trades for this date */}
              <Stack spacing={1.5}>
                {dateTrades.map((trade) => (
                  <ClosedPositionCard key={trade.id} trade={trade} />
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

interface EmptyHistoryProps {
  filter: FilterType;
}

function EmptyHistory({ filter }: EmptyHistoryProps) {
  const messages: Record<FilterType, string> = {
    all: "Your trade history will appear here",
    profitable: "No profitable trades yet",
    loss: "No losing trades - nice!",
  };

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
        <ShowChartIcon sx={{ fontSize: 32, color: "text.secondary" }} />
      </Avatar>
      <Typography variant="body1" color="text.secondary">
        {messages[filter]}
      </Typography>
    </Box>
  );
}



