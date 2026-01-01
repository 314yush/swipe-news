"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Avatar,
  AppBar,
  Toolbar,
  CircularProgress,
  Collapse,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import BottomNav from "@/components/BottomNav";
import CategoryFilter from "@/components/CategoryFilter";
import { FeedItemSkeleton } from "@/components/Skeleton";
import { ToastProvider } from "@/components/Toast";
import useNewsStore from "@/lib/store/newsStore";
import {
  formatRelativeTime,
  isNewsFresh,
  truncateText,
} from "@/lib/utils/formatters";
import { detectMarketCached } from "@/lib/utils/marketMapper";
import type { NewsItem, InteractionType } from "@/lib/types";
import { fetchAndUpdateNews } from "@/lib/services/rssNews";

/**
 * Feed Page - News feed list view
 * 
 * M3 Components Used:
 * - AppBar: M3 top app bar with title and actions
 * - Card: M3 elevated card for news items
 * - Chip: M3 chips for badges (LIVE, interaction status)
 * - IconButton: M3 icon buttons for actions
 * - Typography: M3 typography scales
 * - Avatar: M3 avatar for empty state
 */

function FeedPage() {
  const {
    feedNews,
    setFeedNews,
    currentCategory,
    setCategory,
    interactedNews,
    loading,
    setLoading,
    refreshing,
    setRefreshing,
  } = useNewsStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load RSS news on mount (24 hours for feed page - browsing)
  // Note: News is pre-fetched when user logs in, but we refresh if empty
  useEffect(() => {
    const loadNews = async () => {
      if (feedNews.length === 0) {
        setLoading(true);
        try {
          // Feed page: show news from last 24 hours for browsing
          const rssNews = await fetchAndUpdateNews(undefined, 24 * 60);
          if (rssNews.length > 0) {
            setFeedNews(rssNews);
            console.log(`[Feed Page] Loaded ${rssNews.length} news items (24hr window)`);
          }
        } catch (error) {
          console.error('Error loading RSS news:', error);
          // News will remain empty if fetch fails - user can retry with refresh
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadNews();
  }, [feedNews.length, setFeedNews, setLoading]);

  // Filter news by category
  const filteredNews: NewsItem[] =
    currentCategory === "Trending"
      ? feedNews
      : feedNews.filter((n: NewsItem) => n.category === currentCategory);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Feed page: refresh with 24 hours window
      const rssNews = await fetchAndUpdateNews(
        currentCategory === 'Trending' ? undefined : currentCategory,
        24 * 60
      );
      if (rssNews.length > 0) {
        setFeedNews(rssNews);
        console.log(`[Feed Page] Refreshed ${rssNews.length} news items (24hr window)`);
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        pb: "100px", // Space for bottom nav
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
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
            News Feed
          </Typography>
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            sx={{ color: "text.secondary" }}
          >
            {refreshing ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Category filter */}
      <CategoryFilter
        currentCategory={currentCategory}
        onCategoryChange={setCategory}
      />

      {/* News list */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
        {loading ? (
          // Loading skeletons
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </Box>
        ) : filteredNews.length === 0 ? (
          // Empty state
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
              <NewspaperIcon sx={{ fontSize: 32, color: "text.secondary" }} />
            </Avatar>
            <Typography variant="body1" color="text.secondary">
              No news in this category
            </Typography>
          </Box>
        ) : (
          // News items
          <AnimatePresence>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filteredNews.map((item: NewsItem, index: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <FeedItem
                    news={item}
                    interaction={interactedNews[item.id]}
                    isExpanded={expandedId === item.id}
                    onToggle={() => toggleExpand(item.id)}
                  />
                </motion.div>
              ))}
            </Box>
          </AnimatePresence>
        )}
      </Box>

      {/* Bottom navigation */}
      <BottomNav />
    </Box>
  );
}

interface FeedItemProps {
  news: NewsItem;
  interaction?: InteractionType;
  isExpanded: boolean;
  onToggle: () => void;
}

function FeedItem({ news, interaction, isExpanded, onToggle }: FeedItemProps) {
  const { headline, brief, source, publishedAt, url, category, imageUrl } = news;
  const isFresh = isNewsFresh(publishedAt);
  const { market } = detectMarketCached(headline, brief);

  const interactionBadges: Record<
    string,
    { icon: React.ReactElement; text: string; color: "success" | "error" | "default" }
  > = {
    longed: {
      icon: <TrendingUpIcon sx={{ fontSize: 14 }} />,
      text: "Longed",
      color: "success",
    },
    shorted: {
      icon: <TrendingDownIcon sx={{ fontSize: 14 }} />,
      text: "Shorted",
      color: "error",
    },
    dismissed: {
      icon: <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} />,
      text: "Dismissed",
      color: "default",
    },
  };

  const badge = interaction ? interactionBadges[interaction] : null;

  return (
    <Card
      sx={{
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
      onClick={onToggle}
    >
      {/* News Image */}
      {imageUrl && (
        <Box sx={{ position: "relative" }}>
          <CardMedia
            component="img"
            height="160"
            image={imageUrl}
            alt={headline}
            sx={{ objectFit: "cover" }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
          {/* LIVE badge overlay */}
          {isFresh && (
            <Chip
              label="LIVE"
              size="small"
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                bgcolor: "#FF3B30",
                color: "white",
                fontWeight: 600,
                fontSize: "0.75rem",
                height: 22,
              }}
            />
          )}
        </Box>
      )}

      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {source}
            </Typography>
            {isFresh && !imageUrl && (
              <Chip
                label="LIVE"
                size="small"
                sx={{
                  bgcolor: "error.main",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.625rem",
                  height: 18,
                }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {badge && (
              <Chip
                icon={badge.icon}
                label={badge.text}
                size="small"
                color={badge.color}
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: "0.75rem",
                  "& .MuiChip-icon": {
                    ml: 0.5,
                  },
                }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(publishedAt)}
            </Typography>
          </Box>
        </Box>

        {/* Headline */}
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{
            fontWeight: 500,
            mb: 1,
            lineHeight: 1.4,
          }}
        >
          {headline}
        </Typography>

        {/* Preview / Expanded brief */}
        <Collapse in={isExpanded} collapsedSize={24}>
          {isExpanded ? (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                {brief}
              </Typography>

              {/* Market and link */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={market}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 24, fontSize: "0.75rem" }}
                  />
                  {category && (
                    <Chip
                      label={category}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24, fontSize: "0.75rem" }}
                    />
                  )}
                </Box>
                {url && (
                  <Box
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: "primary.main",
                      textDecoration: "none",
                      fontSize: "0.75rem",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Read more
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {truncateText(brief, 100)}
            </Typography>
          )}
        </Collapse>

        {/* Expand indicator */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              color: "text.secondary",
              transition: "transform 0.2s",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Feed() {
  return (
    <ToastProvider>
      <FeedPage />
    </ToastProvider>
  );
}
