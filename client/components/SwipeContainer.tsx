"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Box, Typography, Avatar, Button, Paper, keyframes } from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SwipeLeftIcon from "@mui/icons-material/SwipeLeft";
import SwipeRightIcon from "@mui/icons-material/SwipeRight";
import SwipeCard from "./SwipeCard";
import useNewsStore from "@/lib/store/newsStore";
import { detectMarketCached } from "@/lib/utils/marketMapper";
import { isMarketOpen } from "@/lib/utils/marketHours";

interface MarketStatus {
  isOpen: boolean;
  message: string;
  category?: string;
}

/**
 * SwipeContainer - "News First, Trading Hidden in Plain Sight"
 * 
 * Features:
 * - Vertical drag guides that glow during interaction
 * - First-time discovery tooltip that appears on first drag attempt
 * - Card stack with smooth animations
 */

// Pulse animation for guide glow
const glowPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

// Number of cards to render in the stack
const VISIBLE_CARDS = 3;

// Local storage key for onboarding
const ONBOARDING_KEY = "swipe-trading-discovered";

interface NewsItem {
  id: string;
  headline: string;
  brief: string;
  source: string;
  publishedAt: string;
  url?: string;
  category?: string;
  imageUrl?: string;
}

interface TradePayload {
  newsId: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
}

interface SwipeContainerProps {
  onTrade?: (trade: TradePayload) => void;
  onMarketClosed?: (market: string, message: string) => void;
  news?: NewsItem[];
}

interface ExitingCard {
  id: string;
  direction: string;
}

export default function SwipeContainer({
  onTrade,
  onMarketClosed,
  news = [],
}: SwipeContainerProps) {
  const { markAsInteracted, interactedNews } = useNewsStore();
  const [exitingCard, setExitingCard] = useState<ExitingCard | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<"up" | "down" | "horizontal" | null>(null);
  const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(false);
  const [hasDiscovered, setHasDiscovered] = useState(true); // Default true to avoid flash

  // Check onboarding status on mount
  useEffect(() => {
    const discovered = localStorage.getItem(ONBOARDING_KEY);
    setHasDiscovered(discovered === "true");
  }, []);

  // Filter out already interacted news
  const availableNews = news.filter((item) => !interactedNews[item.id]);

  // Get current visible cards
  const visibleCards = availableNews.slice(
    currentIndex,
    currentIndex + VISIBLE_CARDS
  );

  // Handle first drag attempt - show discovery tooltip
  const handleFirstDrag = useCallback(() => {
    if (!hasDiscovered) {
      setShowDiscoveryTooltip(true);
    }
  }, [hasDiscovered]);

  // Handle discovery acknowledgment
  const handleDiscoveryAck = useCallback(() => {
    setShowDiscoveryTooltip(false);
    setHasDiscovered(true);
    localStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  // Track drag state for guide indicators
  const handleDragUpdate = useCallback((y: number, x: number) => {
    setIsDragging(true);
    
    // Show discovery on first significant drag
    if (!hasDiscovered && (Math.abs(y) > 20 || Math.abs(x) > 20)) {
      handleFirstDrag();
    }

    if (Math.abs(y) > Math.abs(x)) {
      setDragDirection(y < 0 ? "up" : "down");
    } else {
      setDragDirection("horizontal");
    }
  }, [hasDiscovered, handleFirstDrag]);

  // Handle swipe action
  const handleSwipe = useCallback(
    (newsId: string, direction: string, marketInfo: { market: string; confidence: number }) => {
      const newsItem = availableNews.find((n) => n.id === newsId);
      if (!newsItem) return;

      setIsDragging(false);
      setDragDirection(null);

      // Set exiting card for animation
      setExitingCard({ id: newsId, direction });

      // Determine exit animation
      setTimeout(() => {
        if (direction === "long" || direction === "short") {
          // Check market hours
          const { market } = marketInfo || detectMarketCached(newsItem.headline, newsItem.brief);
          const marketStatus = isMarketOpen(market) as MarketStatus;

          if (!marketStatus.isOpen) {
            // Market is closed
            onMarketClosed?.(market, marketStatus.message);
            markAsInteracted(newsId, "dismissed");
          } else {
            // Open trade
            onTrade?.({
              newsId,
              newsHeadline: newsItem.headline,
              market,
              direction: direction as "long" | "short",
            });
            markAsInteracted(newsId, direction === "long" ? "longed" : "shorted");
          }
        } else {
          // Dismissed
          markAsInteracted(newsId, "dismissed");
        }

        setExitingCard(null);
        setCurrentIndex((prev) => prev + 1);
      }, 200);
    },
    [availableNews, markAsInteracted, onTrade, onMarketClosed]
  );

  // Reset index when news changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [news.length]);

  // Get exit animation based on direction
  const getExitAnimation = (direction: string) => {
    switch (direction) {
      case "long":
        return { y: -500, opacity: 0, scale: 0.8 };
      case "short":
        return { y: 500, opacity: 0, scale: 0.8 };
      case "dismiss":
      default:
        return { x: 300, opacity: 0, rotate: 20 };
    }
  };

  // Empty state with M3 styling
  if (availableNews.length === 0 || visibleCards.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          px: 3,
          textAlign: "center",
        }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            bgcolor: "action.hover",
            mb: 2,
          }}
        >
          <NewspaperIcon sx={{ fontSize: 40, color: "text.secondary" }} />
        </Avatar>
        <Typography variant="h6" sx={{ mb: 1 }}>
          You&apos;re all caught up!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Check back soon for more news to trade on.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Left drag guide */}
      <Box
        sx={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 4,
          height: 80,
          borderRadius: 2,
          transition: "all 0.3s ease",
          ...(isDragging && dragDirection === "horizontal"
            ? {
                background: "rgba(255, 255, 255, 0.3)",
              }
            : {
                background: "rgba(255, 255, 255, 0.05)",
              }),
        }}
      />

      {/* Right drag guide */}
      <Box
        sx={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 4,
          height: 80,
          borderRadius: 2,
          transition: "all 0.3s ease",
          ...(isDragging && dragDirection === "horizontal"
            ? {
                background: "rgba(255, 255, 255, 0.3)",
              }
            : {
                background: "rgba(255, 255, 255, 0.05)",
              }),
        }}
      />

      {/* Top drag guide - Long indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "all 0.3s ease",
          opacity: isDragging && dragDirection === "up" ? 1 : 0,
        }}
      >
        <KeyboardArrowUpIcon
          sx={{
            fontSize: 32,
            color: "#00E676",
            animation: isDragging && dragDirection === "up" 
              ? `${glowPulse} 1s ease-in-out infinite` 
              : "none",
            filter: "drop-shadow(0 0 8px rgba(0, 230, 118, 0.5))",
          }}
        />
      </Box>

      {/* Bottom drag guide - Short indicator */}
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "all 0.3s ease",
          opacity: isDragging && dragDirection === "down" ? 1 : 0,
        }}
      >
        <KeyboardArrowDownIcon
          sx={{
            fontSize: 32,
            color: "#FF5252",
            animation: isDragging && dragDirection === "down" 
              ? `${glowPulse} 1s ease-in-out infinite` 
              : "none",
            filter: "drop-shadow(0 0 8px rgba(255, 82, 82, 0.5))",
          }}
        />
      </Box>

      {/* Card stack */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
          minHeight: 0, // Allow flexbox to control height
        }}
        onPointerMove={(e) => {
          // Track drag for guide indicators
          if (e.buttons === 1) {
            // Only if mouse/touch is pressed
            const rect = e.currentTarget.getBoundingClientRect();
            const centerY = rect.height / 2;
            const centerX = rect.width / 2;
            const y = e.clientY - rect.top - centerY;
            const x = e.clientX - rect.left - centerX;
            handleDragUpdate(y, x);
          }
        }}
        onPointerUp={() => {
          setIsDragging(false);
          setDragDirection(null);
        }}
        onPointerLeave={() => {
          setIsDragging(false);
          setDragDirection(null);
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleCards.map((newsItem, index) => {
            const isExiting = exitingCard?.id === newsItem.id;

            if (isExiting) {
              return (
                <motion.div
                  key={newsItem.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={getExitAnimation(exitingCard.direction)}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-x-4 top-0"
                  style={{ zIndex: 20 }}
                >
                  <Box
                    sx={{
                      bgcolor: "#FFFEF8",
                      borderRadius: "24px",
                      p: 3,
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: "bold", color: "#1A1A1A" }}
                    >
                      {newsItem.headline}
                    </Typography>
                  </Box>
                </motion.div>
              );
            }

            return (
              <SwipeCard
                key={newsItem.id}
                news={newsItem}
                onSwipe={handleSwipe}
                isTop={index === 0}
                index={index}
              />
            );
          })}
        </AnimatePresence>
      </Box>

      {/* Discovery Tooltip - Shows on first swipe attempt */}
      <AnimatePresence>
        {showDiscoveryTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              zIndex: 100,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                bgcolor: "#1E1E1E",
                borderRadius: "24px",
                p: 4,
                maxWidth: 320,
                mx: 3,
                textAlign: "center",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 3, fontWeight: 600, color: "#FFF" }}
              >
                👆 You discovered trading!
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <KeyboardArrowUpIcon sx={{ color: "#00E676", fontSize: 28 }} />
                  <Typography variant="body2" sx={{ color: "#CCC" }}>
                    Swipe <strong style={{ color: "#00E676" }}>up</strong> to go LONG
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <KeyboardArrowDownIcon sx={{ color: "#FF5252", fontSize: 28 }} />
                  <Typography variant="body2" sx={{ color: "#CCC" }}>
                    Swipe <strong style={{ color: "#FF5252" }}>down</strong> to go SHORT
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <SwipeLeftIcon sx={{ color: "#999", fontSize: 24 }} />
                  <SwipeRightIcon sx={{ color: "#999", fontSize: 24 }} />
                  <Typography variant="body2" sx={{ color: "#999" }}>
                    Swipe left/right to skip
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleDiscoveryAck}
                sx={{
                  bgcolor: "#00C853",
                  color: "#FFF",
                  fontWeight: 600,
                  borderRadius: "12px",
                  py: 1.5,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#00B248",
                  },
                }}
              >
                Got it!
              </Button>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
