"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Switch,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Link,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import LockIcon from "@mui/icons-material/Lock";
import BottomNav from "@/components/BottomNav";
import DepositPrompt from "@/components/DepositPrompt";
import { ToastProvider, useToast } from "@/components/Toast";
import useUserStore from "@/lib/store/userStore";
import { formatAddress, formatCurrency } from "@/lib/utils/formatters";

/**
 * Settings Page - User settings and wallet management
 * 
 * M3 Components Used:
 * - AppBar: M3 top app bar with title
 * - Card: M3 cards for grouped settings sections
 * - List: M3 list with ListItem, ListItemButton
 * - Switch: M3 toggle switch
 * - ToggleButtonGroup: M3 segmented button for collateral options
 * - Typography: M3 typography scales including overline for section labels
 * - Avatar: M3 avatar for icons
 */

const COLLATERAL_OPTIONS = [1, 2, 5, 10];

function SettingsPage() {
  const { authenticated, user, login, logout } = usePrivy();
  const toast = useToast();
  const {
    collateralSetting,
    setCollateral,
    showConfirmations,
    toggleConfirmations,
    resetOnboarding,
  } = useUserStore();

  const [copied, setCopied] = useState(false);
  const [showDepositPrompt, setShowDepositPrompt] = useState(false);

  // Get wallet address from Privy
  const walletAddress = user?.wallet?.address || null;

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  // Handle collateral change
  const handleCollateralChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: number | null
  ) => {
    if (newValue !== null) {
      setCollateral(newValue);
    }
  };

  // Check if user has wallet (authenticated or guest)
  const hasWallet = user?.wallet?.address || authenticated;

  // Not authenticated and no guest wallet
  if (!hasWallet) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          pb: "100px",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: 3,
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
            <SettingsIcon sx={{ fontSize: 32, color: "text.secondary" }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
            Connect to access settings
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Connect your wallet or continue as guest to manage your trading
            settings
          </Typography>
          <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 320 }}>
            <Button variant="contained" onClick={login} sx={{ py: 1.5 }}>
              Connect Wallet
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await login();
                } catch (error) {
                  console.error("Failed to create guest session:", error);
                }
              }}
              sx={{ py: 1.5 }}
            >
              Continue as Guest (Testing)
            </Button>
          </Stack>
        </Box>
        <BottomNav />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        pb: "100px",
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
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {/* Wallet Section */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1, px: 0.5 }}
          >
            WALLET
          </Typography>

          <Card>
            <CardContent sx={{ p: 2 }}>
              {/* Wallet address */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "primary.main",
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Connected Wallet
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatAddress(walletAddress || "")}
                    </Typography>
                    {walletAddress && !authenticated && (
                      <Typography
                        variant="caption"
                        sx={{ color: "warning.main" }}
                      >
                        Guest Mode
                      </Typography>
                    )}
                  </Box>
                </Box>
                <IconButton
                  onClick={handleCopyAddress}
                  aria-label="Copy address"
                  size="small"
                >
                  {copied ? (
                    <CheckIcon sx={{ color: "success.main" }} />
                  ) : (
                    <ContentCopyIcon sx={{ color: "text.secondary" }} />
                  )}
                </IconButton>
              </Box>

              {/* Deposit/Withdraw buttons */}
              <Stack direction="row" spacing={1.5}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ py: 1.5 }}
                  onClick={() => {
                    if (!walletAddress) {
                      toast.error("Wallet address not found. Please connect a wallet.");
                      return;
                    }
                    setShowDepositPrompt(true);
                  }}
                >
                  Deposit USDC
                </Button>
                <Button variant="outlined" fullWidth sx={{ py: 1.5 }}>
                  Withdraw
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Trading Settings */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1, px: 0.5 }}
          >
            TRADING
          </Typography>

          <Card>
            <List disablePadding>
              {/* Collateral setting */}
              <ListItem sx={{ flexDirection: "column", alignItems: "stretch", py: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "success.main",
                    }}
                  >
                    <AttachMoneyIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Collateral Amount
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Default collateral per trade
                    </Typography>
                  </Box>
                </Box>

                {/* Collateral options - M3 ToggleButtonGroup */}
                <ToggleButtonGroup
                  value={collateralSetting}
                  exclusive
                  onChange={handleCollateralChange}
                  fullWidth
                  size="medium"
                  sx={{
                    "& .MuiToggleButton-root": {
                      borderRadius: 3,
                      py: 1.5,
                      textTransform: "none",
                      fontWeight: 500,
                      "&.Mui-selected": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": {
                          bgcolor: "primary.dark",
                        },
                      },
                    },
                  }}
                >
                  {COLLATERAL_OPTIONS.map((amount) => (
                    <ToggleButton key={amount} value={amount}>
                      {formatCurrency(amount)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </ListItem>

              <Divider />

              {/* Confirmation toggle */}
              <ListItem
                sx={{ py: 2 }}
                secondaryAction={
                  <Switch
                    checked={showConfirmations}
                    onChange={toggleConfirmations}
                    color="primary"
                  />
                }
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "info.main",
                    }}
                  >
                    <NotificationsIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Trade Confirmations
                    </Typography>
                  }
                  secondary="Show confirmation before trading"
                />
              </ListItem>
            </List>
          </Card>
        </Box>

        {/* App Section */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 1, px: 0.5 }}
          >
            APP
          </Typography>

          <Card>
            <List disablePadding>
              {/* Reset onboarding */}
              <ListItemButton
                onClick={() => {
                  resetOnboarding();
                  toast.success("Onboarding reset. Refresh to see tutorial.");
                }}
                sx={{ py: 2 }}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "warning.main",
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: 24, color: "warning.contrastText" }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Reset Tutorial
                    </Typography>
                  }
                />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>

              <Divider />

              {/* Logout */}
              <ListItemButton onClick={handleLogout} sx={{ py: 2 }}>
                <ListItemIcon>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "error.main",
                    }}
                  >
                    <LogoutIcon sx={{ fontSize: 24, color: "error.contrastText" }} />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 500, color: "error.main" }}
                    >
                      Logout
                    </Typography>
                  }
                />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
            </List>
          </Card>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            SwipeTrader v1.0.0 • Built with ❤️
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              mt: 1,
            }}
          >
            <Link
              href="https://avantis.finance"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "primary.main",
                fontSize: "0.75rem",
              }}
            >
              Powered by Avantis
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Link>
          </Box>
        </Box>
      </Box>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Deposit Prompt Modal */}
      {showDepositPrompt && (
        <DepositPrompt
          walletAddress={walletAddress}
          onContinue={() => setShowDepositPrompt(false)}
        />
      )}
    </Box>
  );
}

export default function Settings() {
  return (
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}
