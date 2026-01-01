"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Link,
  Avatar,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { formatAddress } from "@/lib/utils/formatters";

/**
 * M3 DepositPrompt component
 * 
 * Replaces: Custom deposit prompt with Tailwind
 * M3 Component: Box layout with Card, Button, Typography
 * Why: M3 components provide consistent styling and interactions
 * Styles: Surface colors, primary buttons, M3 spacing
 */

interface DepositPromptProps {
  walletAddress?: string | null;
  onContinue: () => void;
}

export default function DepositPrompt({ walletAddress, onContinue }: DepositPromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

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
      {/* Content */}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center" }}
        >
          {/* Icon */}
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "success.main",
              fontSize: "2.5rem",
              mx: "auto",
              mb: 3,
            }}
          >
            💰
          </Avatar>

          {/* Title */}
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", mb: 1.5 }}
          >
            Deposit USDC to Start
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 320, mx: "auto" }}
          >
            Send USDC to your wallet address on Arbitrum to start trading
          </Typography>

          {/* Wallet address card */}
          <Card sx={{ mb: 3, maxWidth: 360, mx: "auto" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Your Wallet Address
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Typography
                  variant="body2"
                  component="code"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    flex: 1,
                  }}
                >
                  {walletAddress || "Not connected"}
                </Typography>
                <IconButton
                  onClick={handleCopyAddress}
                  disabled={!walletAddress}
                  size="small"
                >
                  {copied ? (
                    <CheckIcon sx={{ color: "success.main" }} />
                  ) : (
                    <ContentCopyIcon sx={{ color: "text.secondary" }} />
                  )}
                </IconButton>
              </Box>
            </CardContent>
          </Card>

          {/* Network info */}
          <Card
            sx={{
              mb: 3,
              maxWidth: 360,
              mx: "auto",
              bgcolor: "info.main",
              color: "info.contrastText",
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Network
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Arbitrum One (Chain ID: 42161)
              </Typography>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Box sx={{ textAlign: "left", maxWidth: 360, mx: "auto", mb: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              How to deposit:
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                  1.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Copy your wallet address above
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                  2.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Send USDC on Arbitrum to this address
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                  3.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click &quot;I&apos;ve Deposited&quot; below
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Bridge link */}
          <Link
            href="https://bridge.arbitrum.io/"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: "0.875rem",
              mb: 4,
            }}
          >
            Need to bridge from Ethereum?
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
        </motion.div>
      </Box>

      {/* Actions */}
      <Box
        sx={{
          p: 3,
          pb: "calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{ py: 1.5 }}
          >
            I&apos;ve Deposited
          </Button>
          <Button
            variant="text"
            size="large"
            onClick={onContinue}
            sx={{ py: 1.5, color: "text.secondary" }}
          >
            Skip for now
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}



