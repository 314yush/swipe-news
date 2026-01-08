"use client";

import { CircularProgress, Box, Typography, Backdrop } from "@mui/material";

/**
 * M3 LoadingSpinner component
 * 
 * Replaces: Custom CSS spinner with Tailwind
 * M3 Component: CircularProgress
 * Why: MUI CircularProgress provides consistent loading indication
 *      with proper M3 styling and accessibility
 * Styles: Primary color by default, customizable size
 */

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "inherit";
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function LoadingSpinner({
  size = "md",
  color = "primary",
}: LoadingSpinnerProps) {
  return (
    <CircularProgress
      size={sizeMap[size]}
      color={color}
      aria-label="Loading"
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={true}
      sx={{
        color: "#fff",
        zIndex: (theme) => theme.zIndex.modal + 1,
        flexDirection: "column",
        gap: 2,
        bgcolor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <CircularProgress size={48} color="inherit" />
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {message}
      </Typography>
    </Backdrop>
  );
}

export function LoadingPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        gap: 2,
      }}
    >
      <CircularProgress size={64} />
      <Typography variant="body1" color="text.secondary">
        Loading...
      </Typography>
    </Box>
  );
}







