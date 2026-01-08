"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

/**
 * RefreshTimer - Shows countdown until next global feed refresh
 * For swipe feed: refreshes every 5 minutes globally (all users see same news)
 * 
 * Note: News is cached globally on the server, so all users see the same
 * news and it refreshes at the same time every 5 minutes for real-time updates.
 */

interface RefreshTimerProps {
  refreshIntervalMinutes?: number; // Default 5 minutes for real-time swipe feed
  onRefresh?: () => void;
  cacheExpiresAt?: string; // ISO timestamp when cache expires (from API)
}

export default function RefreshTimer({
  refreshIntervalMinutes = 30,
  onRefresh,
  cacheExpiresAt,
}: RefreshTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(refreshIntervalMinutes * 60); // in seconds
  const hasTriggeredRef = useRef(false);

  // Calculate time remaining based on cache expiration
  useEffect(() => {
    if (cacheExpiresAt) {
      const updateTimer = () => {
        const now = Date.now();
        const expiresAt = new Date(cacheExpiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        
        setTimeRemaining(remaining);
        
        if (remaining <= 0 && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          if (onRefresh) {
            onRefresh();
          }
        } else if (remaining > 0) {
          hasTriggeredRef.current = false;
        }
      };
      
      // Update immediately
      updateTimer();
      
      // Then update every second
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      // Fallback: use refreshIntervalMinutes if no cacheExpiresAt
      const lastRefreshTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastRefreshTime) / 1000);
        const remaining = refreshIntervalMinutes * 60 - elapsed;

        if (remaining <= 0 && !hasTriggeredRef.current) {
          setTimeRemaining(0);
          hasTriggeredRef.current = true;
          if (onRefresh) {
            onRefresh();
          }
        } else if (remaining > 0) {
          setTimeRemaining(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cacheExpiresAt, refreshIntervalMinutes, onRefresh]);


  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.75,
        px: 2,
        py: 1,
        bgcolor: "rgba(99, 102, 241, 0.05)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <RefreshIcon
        sx={{
          fontSize: 14,
          color: "text.secondary",
          animation: timeRemaining <= 30 ? "spin 2s linear infinite" : "none",
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.75rem",
          fontWeight: 500,
        }}
      >
        Refreshes in {formatTime(timeRemaining)}
      </Typography>
    </Box>
  );
}

