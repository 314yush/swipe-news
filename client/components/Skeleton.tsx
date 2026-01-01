"use client";

import { Skeleton as MuiSkeleton, Card, CardContent, Box } from "@mui/material";

/**
 * M3 Skeleton components
 * 
 * Replaces: Custom shimmer animation skeletons
 * M3 Component: MUI Skeleton with wave animation
 * Why: MUI Skeleton provides consistent loading states with proper M3 styling
 */

interface SkeletonProps {
  variant?: "text" | "rectangular" | "circular" | "rounded";
  width?: number | string;
  height?: number | string;
  className?: string;
}

export default function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
}: SkeletonProps) {
  return (
    <MuiSkeleton
      variant={variant}
      width={width}
      height={height}
      animation="wave"
      className={className}
    />
  );
}

export function NewsCardSkeleton() {
  return (
    <Card>
      <CardContent>
        {/* Source and time */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <MuiSkeleton variant="text" width={100} height={16} animation="wave" />
          <MuiSkeleton variant="text" width={60} height={16} animation="wave" />
        </Box>

        {/* Headline */}
        <Box sx={{ mb: 2 }}>
          <MuiSkeleton variant="text" width="100%" height={24} animation="wave" />
          <MuiSkeleton variant="text" width="75%" height={24} animation="wave" />
        </Box>

        {/* Brief */}
        <Box sx={{ mb: 2 }}>
          <MuiSkeleton variant="text" width="100%" height={16} animation="wave" />
          <MuiSkeleton variant="text" width="100%" height={16} animation="wave" />
          <MuiSkeleton variant="text" width="66%" height={16} animation="wave" />
        </Box>

        {/* Market badge */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 2 }}>
          <MuiSkeleton variant="rounded" width={80} height={24} animation="wave" />
          <MuiSkeleton variant="rounded" width={32} height={32} animation="wave" />
        </Box>
      </CardContent>
    </Card>
  );
}

export function PositionCardSkeleton() {
  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <MuiSkeleton variant="rounded" width={80} height={24} animation="wave" />
          <MuiSkeleton variant="text" width={60} height={16} animation="wave" />
        </Box>

        {/* Headline */}
        <MuiSkeleton variant="text" width="100%" height={20} animation="wave" sx={{ mb: 2 }} />

        {/* Price info */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box>
            <MuiSkeleton variant="text" width={60} height={12} animation="wave" />
            <MuiSkeleton variant="text" width={100} height={20} animation="wave" />
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <MuiSkeleton variant="text" width={60} height={12} animation="wave" sx={{ ml: "auto" }} />
            <MuiSkeleton variant="text" width={80} height={20} animation="wave" />
          </Box>
        </Box>

        {/* P&L */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <MuiSkeleton variant="text" width={100} height={24} animation="wave" />
          <MuiSkeleton variant="rounded" width={80} height={32} animation="wave" />
        </Box>
      </CardContent>
    </Card>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <MuiSkeleton variant="text" width={80} height={16} animation="wave" sx={{ mb: 1 }} />
        <MuiSkeleton variant="text" width={120} height={32} animation="wave" />
      </CardContent>
    </Card>
  );
}

export function FeedItemSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        {/* Source and time */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
          <MuiSkeleton variant="text" width={80} height={16} animation="wave" />
          <Box sx={{ display: "flex", gap: 1 }}>
            <MuiSkeleton variant="rounded" width={60} height={20} animation="wave" />
            <MuiSkeleton variant="text" width={50} height={16} animation="wave" />
          </Box>
        </Box>

        {/* Headline */}
        <MuiSkeleton variant="text" width="100%" height={20} animation="wave" />
        <MuiSkeleton variant="text" width="80%" height={20} animation="wave" sx={{ mb: 1 }} />

        {/* Brief preview */}
        <MuiSkeleton variant="text" width="100%" height={16} animation="wave" />
      </CardContent>
    </Card>
  );
}



