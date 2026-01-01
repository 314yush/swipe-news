"use client";

import { useRef, useEffect } from "react";
import { Box, Chip, Stack } from "@mui/material";
import { CATEGORIES } from "@/lib/config/categories";

/**
 * CategoryFilter - News category pills
 * 
 * Clean, minimal design without emoji hints
 */

interface CategoryFilterProps {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({
  currentCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLDivElement>(null);

  // Scroll active category into view
  useEffect(() => {
    if (activeChipRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const chip = activeChipRef.current;
      const containerRect = container.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();

      if (
        chipRect.left < containerRect.left ||
        chipRect.right > containerRect.right
      ) {
        chip.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentCategory]);

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Stack
        ref={scrollContainerRef}
        direction="row"
        spacing={1}
        sx={{
          overflowX: "auto",
          px: 2,
          py: 1.5,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          WebkitOverflowScrolling: "touch",
        }}
      >
        {CATEGORIES.map((category: string) => {
          const isActive = currentCategory === category;

          return (
            <Box
              key={category}
              ref={isActive ? activeChipRef : null}
              sx={{ flexShrink: 0 }}
            >
              <Chip
                label={category}
                onClick={() => onCategoryChange(category)}
                sx={{
                  height: 32,
                  px: 1,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  transition: "all 0.2s ease",
                  borderRadius: "16px",
                  ...(isActive
                    ? {
                        background: "linear-gradient(135deg, #00C853 0%, #00B248 100%)",
                        color: "#FFFFFF",
                        boxShadow: "0 2px 8px rgba(0, 200, 83, 0.25)",
                        border: "none",
                        "&:hover": {
                          background: "linear-gradient(135deg, #00B248 0%, #009E3C 100%)",
                        },
                      }
                    : {
                        bgcolor: "transparent",
                        border: "1px solid",
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.08)",
                          borderColor: "rgba(255, 255, 255, 0.25)",
                        },
                      }),
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
