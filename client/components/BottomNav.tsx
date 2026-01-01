"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
  Badge,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SettingsIcon from "@mui/icons-material/Settings";
import useUserStore from "@/lib/store/userStore";
import { useEffect, useState } from "react";

/**
 * BottomNav - "News First, Trading Hidden in Plain Sight"
 * 
 * Features:
 * - Custom "Swipe" icon with card stack + arrows visual
 * - First visit badge to encourage discovery
 * - Subtle green active state
 */

// Custom Swipe icon - card stack with up/down arrows
function SwipeIcon({ isActive }: { isActive: boolean }) {
  const color = isActive ? "#FFFFFF" : "#9E9E9E";
  
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Back card */}
      <rect
        x="6"
        y="4"
        width="12"
        height="14"
        rx="2"
        fill={isActive ? "rgba(255,255,255,0.3)" : "rgba(158,158,158,0.3)"}
      />
      {/* Front card */}
      <rect
        x="4"
        y="6"
        width="12"
        height="14"
        rx="2"
        fill={color}
        stroke={isActive ? "#00C853" : "transparent"}
        strokeWidth="0.5"
      />
      {/* Up arrow */}
      <path
        d="M18 8L20 6L22 8"
        stroke={isActive ? "#00E676" : "#666"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Down arrow */}
      <path
        d="M18 16L20 18L22 16"
        stroke={isActive ? "#FF5252" : "#666"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const FIRST_VISIT_KEY = "swipe-first-visit";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasCompletedOnboarding } = useUserStore();
  const [showFirstVisitBadge, setShowFirstVisitBadge] = useState(false);

  // Check if first visit
  useEffect(() => {
    const visited = localStorage.getItem(FIRST_VISIT_KEY);
    if (!visited && pathname !== "/") {
      setShowFirstVisitBadge(true);
    }
  }, [pathname]);

  // Clear badge when visiting swipe page
  useEffect(() => {
    if (pathname === "/" && showFirstVisitBadge) {
      setShowFirstVisitBadge(false);
      localStorage.setItem(FIRST_VISIT_KEY, "true");
    }
  }, [pathname, showFirstVisitBadge]);

  const handleNavigation = (_event: React.SyntheticEvent, newValue: string) => {
    router.push(newValue);
  };

  // Find current route
  const currentValue = pathname || "/";

  const navItems: NavItem[] = [
    {
      path: "/",
      label: "Swipe",
      icon: <SwipeIcon isActive={false} />,
      activeIcon: <SwipeIcon isActive={true} />,
    },
    {
      path: "/feed",
      label: "Feed",
      icon: <NewspaperIcon />,
    },
    {
      path: "/portfolio",
      label: "Portfolio",
      icon: <AccountBalanceWalletIcon />,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: <SettingsIcon />,
    },
  ];

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderTop: 1,
        borderColor: "divider",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      elevation={0}
    >
      <BottomNavigation
        value={currentValue}
        onChange={handleNavigation}
        showLabels
        sx={{
          height: 80,
          bgcolor: "background.paper",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 80,
            py: 1.5,
            gap: 0.5,
            color: "text.secondary",
            "&.Mui-selected": {
              color: "primary.main",
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.75rem",
            fontWeight: 500,
            "&.Mui-selected": {
              fontSize: "0.75rem",
            },
          },
        }}
      >
        {navItems.map((item) => {
          const isActive = currentValue === item.path;
          const showBadge = item.path === "/" && showFirstVisitBadge;

          return (
            <BottomNavigationAction
              key={item.path}
              value={item.path}
              label={item.label}
              icon={
                <Badge
                  color="error"
                  variant="dot"
                  invisible={!showBadge}
                  sx={{
                    "& .MuiBadge-dot": {
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 32,
                      borderRadius: 4,
                      bgcolor: isActive ? "primary.main" : "transparent",
                      color: isActive ? "primary.contrastText" : "inherit",
                      transition: "all 0.2s ease",
                      boxShadow: isActive 
                        ? "0 2px 8px rgba(0, 200, 83, 0.25)" 
                        : "none",
                      "& .MuiSvgIcon-root": {
                        fontSize: 24,
                      },
                    }}
                  >
                    {isActive && item.activeIcon ? item.activeIcon : item.icon}
                  </Box>
                </Badge>
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
