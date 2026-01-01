"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Avatar,
  keyframes,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ShareIcon from "@mui/icons-material/Share";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { formatRelativeTime, isNewsFresh, truncateText } from "@/lib/utils/formatters";
import { detectMarketCached } from "@/lib/utils/marketMapper";

/**
 * SwipeCard - Compact news card for swipe trading
 */

// Pulse animation for fresh news
const pulseKeyframes = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
`;

interface News {
  id: string;
  headline: string;
  brief: string;
  source: string;
  publishedAt: string;
  url?: string;
  category?: string;
  imageUrl?: string;
  relevantPairs?: string[]; // Trading pairs this news is relevant to
}

interface SwipeCardProps {
  news: News;
  onSwipe?: (
    id: string,
    direction: string,
    metadata: { market: string; confidence: number }
  ) => void;
  isTop?: boolean;
  index?: number;
  style?: React.CSSProperties;
}

function isNewsVeryFresh(publishedAt: string): boolean {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now.getTime() - published.getTime();
  const diffMins = diffMs / (1000 * 60);
  return diffMins < 15;
}

export default function SwipeCard({
  news,
  onSwipe,
  isTop = false,
  index = 0,
  style = {},
}: SwipeCardProps) {
  const { id, headline, brief, source, publishedAt, imageUrl, relevantPairs = [] } = news;
  const [isDragging, setIsDragging] = useState(false);

  const { market, confidence } = detectMarketCached(headline, brief);
  const isFresh = isNewsFresh(publishedAt);
  const isVeryFresh = isNewsVeryFresh(publishedAt);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);

  const longOpacity = useTransform(y, [-150, -50, 0], [1, 0.5, 0]);
  const shortOpacity = useTransform(y, [0, 50, 150], [0, 0.5, 1]);
  const dismissOpacity = useTransform(
    x,
    [-150, -50, 0, 50, 150],
    [1, 0.5, 0, 0.5, 1]
  );

  const cardBgUp = useTransform(
    y,
    [-100, 0],
    ["rgba(0, 230, 118, 0.04)", "rgba(0, 230, 118, 0)"]
  );
  const cardBgDown = useTransform(
    y,
    [0, 100],
    ["rgba(255, 82, 82, 0)", "rgba(255, 82, 82, 0.04)"]
  );

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    let direction: string | null = null;

    if (offset.y < -swipeThreshold || velocity.y < -velocityThreshold) {
      direction = "long";
    } else if (offset.y > swipeThreshold || velocity.y > velocityThreshold) {
      direction = "short";
    } else if (
      Math.abs(offset.x) > swipeThreshold ||
      Math.abs(velocity.x) > velocityThreshold
    ) {
      direction = "dismiss";
    }

    if (direction && onSwipe) {
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
      onSwipe(id, direction, { market, confidence });
    }
  };

  const scale = isTop ? 1 : 1 - index * 0.05;
  const translateY = isTop ? 0 : index * 6;

  return (
    <motion.div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: 0,
        bottom: 0,
        margin: "auto",
        zIndex: 10 - index,
        scale,
        y: translateY,
        width: "calc(100% - 24px)",
        maxWidth: "100%",
        maxHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <motion.div
        drag={isTop}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotate }}
        whileDrag={{ cursor: "grabbing" }}
        className="relative touch-none"
      >
        <Card
          sx={{
            borderRadius: "20px",
            overflow: "hidden",
            bgcolor: "#FFFEF8",
            boxShadow: `0 1px 3px rgba(0, 0, 0, 0.08), 0 6px 20px rgba(0, 0, 0, 0.12)`,
            border: "none",
            position: "relative",
            width: "100%",
            height: "100%",
            maxHeight: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Subtle background tint during drag */}
          {isTop && isDragging && (
            <>
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: cardBgUp,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: cardBgDown,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            </>
          )}

          {/* Direction overlays */}
          {isTop && (
            <>
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 230, 118, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 10,
                  opacity: longOpacity,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <TrendingUpIcon sx={{ fontSize: 48, color: "#00E676" }} />
                  <Typography
                    variant="h6"
                    sx={{ color: "#00E676", fontWeight: "bold", mt: 0.5 }}
                  >
                    LONG
                  </Typography>
                </Box>
              </motion.div>

              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(255, 82, 82, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 10,
                  opacity: shortOpacity,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <TrendingDownIcon sx={{ fontSize: 48, color: "#FF5252" }} />
                  <Typography
                    variant="h6"
                    sx={{ color: "#FF5252", fontWeight: "bold", mt: 0.5 }}
                  >
                    SHORT
                  </Typography>
                </Box>
              </motion.div>

              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  zIndex: 10,
                  opacity: dismissOpacity,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: "#666", fontWeight: "bold" }}
                >
                  NEXT
                </Typography>
              </motion.div>
            </>
          )}

          {/* News Image - Reduced height */}
          {imageUrl && (
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <CardMedia
                component="img"
                image={imageUrl}
                alt={headline}
                sx={{ 
                  objectFit: "cover",
                  width: "100%",
                  height: "140px",
                  maxHeight: "140px",
                }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://via.placeholder.com/400x140/FFFEF8/666666?text=${encodeURIComponent(
                    headline.substring(0, 30)
                  )}`;
                }}
              />
              <Chip
                label={formatRelativeTime(publishedAt)}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: 22,
                  ...(isVeryFresh
                    ? {
                        background: "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)",
                        color: "white",
                        animation: `${pulseKeyframes} 2s ease-in-out infinite`,
                      }
                    : isFresh
                    ? {
                        bgcolor: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(4px)",
                        color: "white",
                      }
                    : {
                        bgcolor: "rgba(0, 0, 0, 0.4)",
                        color: "rgba(255, 255, 255, 0.8)",
                      }),
                }}
              />
            </Box>
          )}

          {/* Card content - More compact */}
          <CardContent 
            sx={{ 
              p: 2, 
              pb: 1.5, 
              position: "relative", 
              zIndex: 2,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
              minHeight: 0,
            }}
          >
            {!imageUrl && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                <Chip
                  label={formatRelativeTime(publishedAt)}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    height: 22,
                    ...(isVeryFresh
                      ? {
                          background: "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)",
                          color: "white",
                          animation: `${pulseKeyframes} 2s ease-in-out infinite`,
                        }
                      : {
                          bgcolor: "rgba(0, 0, 0, 0.05)",
                          color: "#999",
                        }),
                  }}
                />
              </Box>
            )}

            {/* Headline - Smaller */}
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 700,
                color: "#1A1A1A",
                mb: 1,
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                fontSize: "1rem",
              }}
            >
              {headline}
            </Typography>

            {/* Brief - Shorter */}
            <Typography
              variant="body2"
              sx={{
                color: "#666666",
                lineHeight: 1.5,
                mb: 1.5,
                fontSize: "0.85rem",
              }}
            >
              {truncateText(brief, 120)}
            </Typography>

            {/* Publisher section - Compact */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "rgba(0, 0, 0, 0.02)",
                borderRadius: "12px",
                p: 1.5,
                mx: -0.5,
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {source.charAt(0)}
                </Avatar>
                <Box>
                  <Typography 
                    sx={{ color: "#999999", fontSize: "0.65rem", lineHeight: 1 }}
                  >
                    Published by
                  </Typography>
                  <Typography
                    sx={{ fontWeight: 600, color: "#1A1A1A", fontSize: "0.8rem" }}
                  >
                    {source}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Token tags - Show relevant trading pairs */}
            {relevantPairs && relevantPairs.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  mb: 1,
                  mx: -0.5,
                }}
              >
                {relevantPairs.slice(0, 5).map((pair) => {
                  // Extract base token from pair (e.g., "BTC/USD" -> "BTC")
                  const baseToken = pair.split('/')[0];
                  return (
                    <Chip
                      key={pair}
                      label={baseToken}
                      size="small"
                      sx={{
                        bgcolor: "rgba(99, 102, 241, 0.1)",
                        color: "#6366F1",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                        height: 24,
                        borderRadius: "8px",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        "& .MuiChip-label": {
                          px: 1,
                        },
                      }}
                    />
                  );
                })}
                {relevantPairs.length > 5 && (
                  <Chip
                    label={`+${relevantPairs.length - 5}`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(0, 0, 0, 0.05)",
                      color: "#666",
                      fontWeight: 500,
                      fontSize: "0.7rem",
                      height: 24,
                      borderRadius: "8px",
                      "& .MuiChip-label": {
                        px: 1,
                      },
                    }}
                  />
                )}
              </Box>
            )}

            {/* Read more link */}
            {news.url && (
              <Box
                component="a"
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "#6366F1",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  mb: 1,
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Read more
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </Box>
            )}
          </CardContent>

          {/* Action icons - Compact */}
          <CardActions
            sx={{
              px: 2,
              pb: 1,
              pt: 0,
              justifyContent: "flex-start",
              gap: 0,
            }}
          >
            <IconButton
              onClick={(e) => e.stopPropagation()}
              aria-label="Like"
              size="small"
              sx={{ 
                color: "#BDBDBD",
                "&:hover": { color: "#FF5252" },
              }}
            >
              <FavoriteBorderIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              onClick={(e) => e.stopPropagation()}
              aria-label="Bookmark"
              size="small"
              sx={{ 
                color: "#BDBDBD",
                "&:hover": { color: "#6366F1" },
              }}
            >
              <BookmarkBorderIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton
              onClick={(e) => e.stopPropagation()}
              aria-label="Share"
              size="small"
              sx={{ 
                color: "#BDBDBD",
                "&:hover": { color: "#00C853" },
              }}
            >
              <ShareIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </CardActions>

          {/* Swipe hint - Minimal */}
          {isTop && (
            <Box
              sx={{
                textAlign: "center",
                py: 1,
                borderTop: "1px solid rgba(0, 0, 0, 0.04)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  opacity: 0.4,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <KeyboardArrowUpIcon sx={{ fontSize: 12, color: "#00C853" }} />
                  <Typography sx={{ fontSize: "9px", color: "#666" }}>
                    Bullish
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: "9px", color: "#CCC" }}>•</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <KeyboardArrowDownIcon sx={{ fontSize: 12, color: "#FF5252" }} />
                  <Typography sx={{ fontSize: "9px", color: "#666" }}>
                    Bearish
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
