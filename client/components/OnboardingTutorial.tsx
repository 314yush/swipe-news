"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Grid,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import useUserStore from "@/lib/store/userStore";

/**
 * M3 OnboardingTutorial component
 * 
 * Replaces: Custom onboarding tutorial with Tailwind
 * M3 Component: Box layout with Card, Button, Typography
 * Why: M3 components provide consistent styling and interactions
 * Styles: Surface colors, primary buttons, M3 spacing
 */

interface SlideDetail {
  label: string;
  value: string;
}

interface Slide {
  id: number;
  title: string;
  description: string;
  icon?: string;
  iconComponent?: typeof TrendingUpIcon;
  animation?: "horizontal" | "up" | "down";
  colors?: {
    left?: string;
    right?: string;
    bg?: string;
    icon?: string;
  };
  details?: SlideDetail[];
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Swipe to Navigate",
    description: "Swipe left or right to dismiss news you're not interested in",
    icon: "👆",
    animation: "horizontal",
    colors: {
      left: "bg-on-surface-dark/20",
      right: "bg-on-surface-dark/20",
    },
  },
  {
    id: 2,
    title: "Swipe Up to Long",
    description: "When you're bullish on a news story, swipe up to open a LONG position",
    iconComponent: TrendingUpIcon,
    animation: "up",
    colors: {
      bg: "success.main",
      icon: "success.main",
    },
  },
  {
    id: 3,
    title: "Swipe Down to Short",
    description: "When you're bearish, swipe down to open a SHORT position",
    iconComponent: TrendingDownIcon,
    animation: "down",
    colors: {
      bg: "error.main",
      icon: "error.main",
    },
  },
  {
    id: 4,
    title: "Trade Parameters",
    description: "All trades use: $1 collateral, 75x leverage, 100% take profit, no stop loss",
    icon: "⚙️",
    details: [
      { label: "Collateral", value: "$1" },
      { label: "Leverage", value: "75x" },
      { label: "Take Profit", value: "+100%" },
      { label: "Stop Loss", value: "None" },
    ],
  },
];

interface OnboardingTutorialProps {
  onComplete?: () => void;
}

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { markOnboardingComplete } = useUserStore();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    markOnboardingComplete();
    onComplete?.();
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "background.default",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Skip button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          p: 2,
          pt: "calc(16px + env(safe-area-inset-top))",
        }}
      >
        <Button
          variant="text"
          onClick={handleSkip}
          sx={{ color: "text.secondary" }}
        >
          Skip
        </Button>
      </Box>

      {/* Slide content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 4,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: "center", width: "100%" }}
          >
            {/* Icon/Animation area */}
            <Box sx={{ mb: 4 }}>
              {slide.animation === "horizontal" && <HorizontalSwipeAnimation />}
              {slide.animation === "up" && (
                <VerticalSwipeAnimation direction="up" />
              )}
              {slide.animation === "down" && (
                <VerticalSwipeAnimation direction="down" />
              )}
              {slide.details && <TradeParametersCard details={slide.details} />}
              {!slide.animation && !slide.details && slide.icon && (
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    bgcolor: "action.hover",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    fontSize: "3rem",
                  }}
                >
                  {slide.icon}
                </Box>
              )}
            </Box>

            {/* Title */}
            <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1.5 }}>
              {slide.title}
            </Typography>

            {/* Description */}
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 320, mx: "auto" }}
            >
              {slide.description}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          p: 3,
          pb: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Progress dots */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 3 }}
        >
          {slides.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: index === currentSlide ? "primary.main" : "action.disabled",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </Stack>

        {/* Buttons */}
        <Stack direction="row" spacing={1.5}>
          {currentSlide > 0 && (
            <Button
              variant="outlined"
              onClick={handlePrev}
              startIcon={<ChevronLeftIcon />}
              sx={{ flex: 1, py: 1.5 }}
            >
              Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={!isLastSlide && <ChevronRightIcon />}
            sx={{ flex: 1, py: 1.5 }}
          >
            {isLastSlide ? "Get Started" : "Next"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function HorizontalSwipeAnimation() {
  return (
    <Box sx={{ position: "relative", width: 192, height: 128, mx: "auto" }}>
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        animate={{ x: [-30, 30, -30] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Card
          sx={{
            width: 96,
            height: 128,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
          }}
        >
          📰
        </Card>
      </motion.div>

      {/* Arrows */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          color: "text.secondary",
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 24 }} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          color: "text.secondary",
        }}
      >
        <ChevronRightIcon sx={{ fontSize: 24 }} />
      </Box>
    </Box>
  );
}

interface VerticalSwipeAnimationProps {
  direction: "up" | "down";
}

function VerticalSwipeAnimation({ direction }: VerticalSwipeAnimationProps) {
  const isUp = direction === "up";
  const Icon = isUp ? TrendingUpIcon : TrendingDownIcon;
  const color = isUp ? "success.main" : "error.main";
  const bgColor = isUp ? "rgba(0, 200, 83, 0.2)" : "rgba(244, 67, 54, 0.2)";

  return (
    <Box sx={{ position: "relative", width: 192, height: 192, mx: "auto" }}>
      <motion.div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
        }}
        animate={{
          y: isUp ? [0, -30, 0] : [0, 30, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Box
          sx={{
            bgcolor: bgColor,
            borderRadius: 3,
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ fontSize: 48, color }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: "bold", color, mt: 1 }}
          >
            {isUp ? "LONG" : "SHORT"}
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}

interface TradeParametersCardProps {
  details: SlideDetail[];
}

function TradeParametersCard({ details }: TradeParametersCardProps) {
  return (
    <Card sx={{ maxWidth: 320, mx: "auto" }}>
      <CardContent sx={{ p: 2 }}>
        <Grid container spacing={1.5}>
          {details.map((item, index) => (
            <Grid size={{ xs: 6 }} key={index}>
              <Box
                sx={{
                  textAlign: "center",
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {item.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}



