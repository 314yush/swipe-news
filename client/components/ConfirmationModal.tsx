"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Slide,
  Divider,
  Stack,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WarningIcon from "@mui/icons-material/Warning";
import { formatCurrency, formatLeverage, formatMarket } from "@/lib/utils/formatters";
import useUserStore from "@/lib/store/userStore";
import React from "react";

/**
 * ConfirmationModal - Improved sizing and formatting
 * 
 * Clean, compact design with better spacing and visual hierarchy
 */

interface Trade {
  market: string;
  direction: "long" | "short";
  headline?: string;
  newsHeadline?: string;
  leverage?: number;
  collateral?: number;
  minSize?: number;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trade: Trade) => void;
  trade: Trade | null;
  isLoading?: boolean;
}

// Slide transition from bottom (M3 bottom sheet style)
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  trade,
  isLoading = false,
}: ConfirmationModalProps) {
  const { collateralSetting, setShowConfirmations } = useUserStore();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!trade) return null;

  const { market, direction, headline, newsHeadline, leverage, collateral, minSize } = trade;
  const isLong = direction === "long";
  
  // Use dynamic values if available, otherwise fallback to defaults
  const displayLeverage = leverage || 75;
  const displayCollateral = collateral || collateralSetting;
  const positionSize = displayCollateral * displayLeverage;

  const handleConfirm = () => {
    if (dontShowAgain) {
      setShowConfirmations(false);
    }
    onConfirm(trade);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "24px 24px 0 0",
          position: "fixed",
          bottom: 0,
          m: 0,
          maxHeight: "90vh",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
        },
      }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-end",
        },
      }}
    >
      {/* Handle bar */}
      <Box sx={{ display: "flex", justifyContent: "center", pt: 1.5, pb: 0.5 }}>
        <Box
          sx={{
            width: 36,
            height: 4,
            bgcolor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          px: 3,
          pb: 1.5,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Confirm Trade
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent 
        sx={{ 
          p: 3,
          px: 3,
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Direction badge and Market */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Chip
            icon={isLong ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={isLong ? "LONG" : "SHORT"}
            sx={{
              px: 2.5,
              py: 1.5,
              height: "auto",
              fontSize: "1rem",
              fontWeight: 700,
              bgcolor: isLong ? "success.main" : "error.main",
              color: "white",
              "& .MuiChip-icon": {
                color: "white",
                fontSize: 20,
                ml: 0.5,
              },
            }}
          />
          <Typography
            variant="h5"
            sx={{ 
              fontWeight: 700,
              fontSize: "1.5rem",
            }}
          >
            {formatMarket(market)}
          </Typography>
        </Box>

        {/* Trade details - Compact grid */}
        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 2,
            p: 2,
          }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Collateral
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {formatCurrency(displayCollateral)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Leverage
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {formatLeverage(displayLeverage)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Take Profit
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem", color: "success.main" }}>
                +100%
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Stop Loss
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.secondary" }}>
                None
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                Position Size
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                {formatCurrency(positionSize)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* News headline */}
        {(headline || newsHeadline) && (
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", mb: 0.5, display: "block" }}>
              Based on
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}
            >
              {headline || newsHeadline}
            </Typography>
          </Box>
        )}

        {/* Risk warning */}
        <Alert
          severity="warning"
          icon={<WarningIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderRadius: 2,
            bgcolor: "rgba(255, 193, 7, 0.1)",
            border: "1px solid rgba(255, 193, 7, 0.2)",
            "& .MuiAlert-icon": {
              color: "warning.main",
            },
            "& .MuiAlert-message": {
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              color: "text.secondary",
            },
          }}
        >
          Trading with leverage involves significant risk. You could lose your entire collateral. Only trade with funds you can afford to lose.
        </Alert>

        {/* Don't show again checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
              Don&apos;t show this confirmation again
            </Typography>
          }
          sx={{ mt: -0.5 }}
        />
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          gap: 1.5,
          pb: "calc(24px + env(safe-area-inset-bottom))",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isLoading}
          fullWidth
          sx={{ 
            py: 1.25,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            borderColor: "rgba(255, 255, 255, 0.2)",
            "&:hover": {
              borderColor: "rgba(255, 255, 255, 0.3)",
              bgcolor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isLoading}
          fullWidth
          sx={{ 
            py: 1.25,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            bgcolor: isLong ? "success.main" : "error.main",
            "&:hover": {
              bgcolor: isLong ? "#00B248" : "#D32F2F",
            },
            "&:disabled": {
              bgcolor: isLong ? "success.main" : "error.main",
              opacity: 0.6,
            },
          }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Signing Transaction...
            </>
          ) : (
            `Confirm ${isLong ? "Long" : "Short"}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
