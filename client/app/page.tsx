"use client";

import { useEffect, useState } from "react";
import { usePrivy, useSignTransaction } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { Box, Button, Typography, Avatar, Stack } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BottomNav from "@/components/BottomNav";
import CategoryFilter from "@/components/CategoryFilter";
import SwipeContainer from "@/components/SwipeContainer";
import ConfirmationModal from "@/components/ConfirmationModal";
import RefreshTimer from "@/components/RefreshTimer";
import { ToastProvider, useToast } from "@/components/Toast";
import { LoadingPage } from "@/components/LoadingSpinner";
import useNewsStore from "@/lib/store/newsStore";
import useUserStore from "@/lib/store/userStore";
import useTradeStore from "@/lib/store/tradeStore";
import { buildTransaction, executeTrade } from "@/lib/services/api";
import { getOptimalTradeParams, isPairAvailable, prewarmCache } from "@/lib/services/avantisPairs";
import { fetchAndUpdateNews } from "@/lib/services/rssNews";

/**
 * Swipe Page - Main trading interface
 * 
 * M3 Components Used:
 * - Box: Layout container with M3 spacing
 * - Button: M3 filled and outlined button variants
 * - Typography: M3 typography scales
 * - Avatar: M3 avatar for logo
 * - Stack: M3 flex layout
 */

interface PendingTrade {
  newsId: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
  leverage?: number;
  collateral?: number;
  minSize?: number;
}

function SwipePage() {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { currentCategory, setCategory, setNews, setFeedNews, news } = useNewsStore();
  const { collateralSetting, hasCompletedOnboarding, setUser } = useUserStore();
  const { addTrade, setExecuting, isExecuting } = useTradeStore();
  const toast = useToast();

  const [pendingTrade, setPendingTrade] = useState<PendingTrade | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cacheExpiresAt, setCacheExpiresAt] = useState<string | undefined>(); // Cache expiration time for timer

  // Pre-warm Avantis pairs cache on mount
  useEffect(() => {
    if (ready && authenticated) {
      prewarmCache().catch((error) => {
        console.warn('Failed to pre-warm Avantis pairs cache:', error);
      });
    }
  }, [ready, authenticated]);

  // Save user to Supabase when user object changes
  useEffect(() => {
    if (user && authenticated) {
      setUser(user);
    }
  }, [user, authenticated, setUser]);

  // Load RSS news when user authenticates (fetch both swipe and feed news)
  useEffect(() => {
    const loadNews = async () => {
      if (ready && authenticated) {
        try {
          // Fetch both sets of news in parallel for better performance
          const [swipeResult, feedResult] = await Promise.all([
            // Swipe page: only show news from last 15 minutes for fresh, actionable content
            fetchAndUpdateNews(undefined, 15),
            // Feed page: show news from last 24 hours for browsing
            fetchAndUpdateNews(undefined, 24 * 60),
          ]);

          if (swipeResult.items.length > 0) {
            setNews(swipeResult.items);
            setCacheExpiresAt(swipeResult.cacheExpiresAt); // Set cache expiration for timer
            console.log(`[Swipe Page] Loaded ${swipeResult.items.length} news items (15min window)`);
          } else {
            console.warn('[Swipe Page] No news found in 15-minute window. Try refreshing or check if feeds are updating.');
          }

          if (feedResult.items.length > 0) {
            setFeedNews(feedResult.items);
            console.log(`[Feed Page] Loaded ${feedResult.items.length} news items (24hr window)`);
          } else {
            console.warn('[Feed Page] No news found in 24-hour window.');
          }
        } catch (error) {
          console.error('Error loading RSS news:', error);
        }
      }
    };
    
    loadNews();
  }, [ready, authenticated, setNews, setFeedNews]);

  // Handle trade initiation - show confirmation with details, then trigger signing
  const handleTrade = async (trade: PendingTrade) => {
    try {
      // Get optimal trade parameters: minimum collateral and maximum leverage
      console.log(`📊 [UI] Fetching optimal trade params for ${trade.market}...`);
      
      const optimalParams = await getOptimalTradeParams(trade.market);

      const tradeWithInfo: PendingTrade = {
        ...trade,
        leverage: optimalParams.leverage,
        collateral: optimalParams.collateral, // Always use minimum
        minSize: optimalParams.minSize,
      };

      // Inform user that we're using optimal settings
      console.log(`📊 [UI] Using optimal trade params for ${trade.market}:`, {
        collateral: `$${optimalParams.collateral} (minimum)`,
        leverage: `${optimalParams.leverage}x (maximum)`,
        positionSize: `$${optimalParams.collateral * optimalParams.leverage}`,
      });

      setPendingTrade(tradeWithInfo);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Failed to fetch market info:', error);
      // Still show modal with defaults if fetch fails
      setPendingTrade(trade);
      setShowConfirmation(true);
    }
  };

  // Handle market closed
  const handleMarketClosed = (market: string, message: string) => {
    toast.warning(`${market} market is closed`, {
      title: "Market Closed",
      duration: 4000,
    });
  };

  // Handle confirmation - immediately trigger signing
  const handleConfirm = () => {
    if (pendingTrade) {
      executePendingTrade(pendingTrade);
    }
  };

  // Handle feed refresh
  const handleRefresh = async () => {
    try {
      const result = await fetchAndUpdateNews(undefined, 15);
      if (result.items.length > 0) {
        setNews(result.items);
        setCacheExpiresAt(result.cacheExpiresAt); // Update cache expiration for timer
        console.log(`[Swipe Page] Refreshed ${result.items.length} news items (15min window)`);
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    if (!isExecuting) {
      setShowConfirmation(false);
      setPendingTrade(null);
    }
  };

  // Execute the trade - Privy signing popup will appear after confirmation
  const executePendingTrade = async (trade: typeof pendingTrade) => {
    if (!trade) return;

    setExecuting(true);
    // Keep modal open to show signing state

    try {
      // Ensure user is saved to Supabase first
      if (user && authenticated) {
        try {
          await setUser(user);
        } catch (error) {
          console.warn('Failed to save user to Supabase:', error);
        }
      }

      // Get user ID from Supabase if available (optimized - single attempt with short delay)
      let userId = null;
      if (user?.id) {
        try {
          const { getUserIdByPrivyId } = await import('@/lib/services/supabase');
          // Single attempt with short delay to allow user save to complete
          await new Promise(resolve => setTimeout(resolve, 200));
          userId = await getUserIdByPrivyId(user.id);
        } catch (error) {
          console.warn('Failed to get user ID from Supabase:', error);
        }
      }

      // Get wallet address (can be embedded or external wallet)
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const externalWallet = wallets.find((w) => w.walletClientType !== 'privy');
      const walletAddress = embeddedWallet?.address || externalWallet?.address || user?.wallet?.address;
      
      if (!walletAddress) {
        throw new Error("Wallet address not found. Please connect a wallet.");
      }

      // Check if pair is available
      const isAvailable = await isPairAvailable(trade.market);
      if (!isAvailable) {
        throw new Error(`Trading pair ${trade.market} is not available on Avantis`);
      }

      // Get optimal trade parameters: minimum collateral and maximum leverage
      // Use values from pendingTrade if available (from handleTrade), otherwise fetch fresh
      const optimalParams = trade.leverage && trade.collateral
        ? {
            leverage: trade.leverage,
            collateral: trade.collateral,
            minSize: trade.minSize || 1,
            maxLeverage: trade.leverage,
          }
        : await getOptimalTradeParams(trade.market);

      console.log('🔄 [UI] Building unsigned transaction with optimal params...', {
        market: trade.market,
        direction: trade.direction,
        collateral: `$${optimalParams.collateral} (minimum)`,
        leverage: `${optimalParams.leverage}x (maximum)`,
        positionSize: `$${optimalParams.collateral * optimalParams.leverage}`,
      });
      
      const txData = await buildTransaction({
        market: trade.market,
        direction: trade.direction,
        collateral: optimalParams.collateral, // Always minimum
        leverage: optimalParams.leverage, // Always maximum
        userId,
      });

      // Convert transaction to Privy format (EIP-1559 with hex strings)
      const unsignedTx = txData.transaction;
      
      // Ensure all numeric fields are hex strings
      const convertToHex = (value: any): string | undefined => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === 'string') {
          if (value.startsWith('0x')) return value;
          try {
            const num = parseInt(value, 10);
            return `0x${num.toString(16)}`;
          } catch {
            return value;
          }
        }
        if (typeof value === 'number') {
          return `0x${value.toString(16)}`;
        }
        return String(value);
      };
      
      const formattedTx: any = { ...unsignedTx };
      
      // Convert numeric fields to hex
      if (formattedTx.gas !== undefined) formattedTx.gas = convertToHex(formattedTx.gas);
      if (formattedTx.gasLimit !== undefined) {
        formattedTx.gas = convertToHex(formattedTx.gasLimit);
        delete formattedTx.gasLimit;
      }
      if (formattedTx.value !== undefined) formattedTx.value = convertToHex(formattedTx.value);
      if (formattedTx.nonce !== undefined) formattedTx.nonce = convertToHex(formattedTx.nonce);
      if (formattedTx.chainId !== undefined) formattedTx.chainId = convertToHex(formattedTx.chainId);
      if (formattedTx.maxFeePerGas !== undefined) formattedTx.maxFeePerGas = convertToHex(formattedTx.maxFeePerGas);
      if (formattedTx.maxPriorityFeePerGas !== undefined) formattedTx.maxPriorityFeePerGas = convertToHex(formattedTx.maxPriorityFeePerGas);
      if (formattedTx.gasPrice !== undefined) formattedTx.gasPrice = convertToHex(formattedTx.gasPrice);
      
      // Ensure addresses and data are properly formatted
      if (formattedTx.to && !formattedTx.to.startsWith('0x')) {
        formattedTx.to = `0x${formattedTx.to}`;
      }
      if (formattedTx.data && !formattedTx.data.startsWith('0x')) {
        formattedTx.data = `0x${formattedTx.data}`;
      }

      // Check if this is a Privy embedded wallet or external wallet (reuse embeddedWallet from line 118)
      const isEmbeddedWallet = !!embeddedWallet;
      
      if (isEmbeddedWallet) {
        // Use Privy's signTransaction for embedded wallets
        console.log('🔄 [UI] Signing transaction with Privy embedded wallet (popup will appear)...', formattedTx);
        const signedTx = await signTransaction(formattedTx, {
          address: walletAddress as `0x${string}`,
        });
        console.log('✅ [UI] Transaction signed');

        // Use optimal params from pendingTrade (already calculated in handleTrade)
        const finalCollateral = trade.collateral || optimalParams.collateral;
        const finalLeverage = trade.leverage || optimalParams.leverage;

        // Execute trade with signed transaction
        const result = await executeTrade({
          ...trade,
          collateral: finalCollateral, // Minimum collateral
          leverage: finalLeverage, // Maximum leverage
          takeProfit: 100,
          stopLoss: null,
          userId,
          signedTransaction: signedTx,
          pairIndex: txData.pair_index,
          tradeIndex: txData.trade_index,
          entryPrice: txData.entry_price,
        }) as { success: boolean; trade: Record<string, unknown> };
        
        if (result.success) {
          const tradeData = result.trade;
          addTrade(tradeData);
          
          const isRealTrade = tradeData.txHash && !tradeData.id?.toString().startsWith('trade-');
          const txHash = tradeData.txHash as string;
          const entryPrice = tradeData.entryPrice as number;
          
          toast.success(
            `${trade.direction.toUpperCase()} ${trade.market} opened! Entry: $${entryPrice?.toFixed(2)}`,
            { 
              duration: 5000,
              description: txHash ? `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}` : undefined
            }
          );
        }
      } else {
        // For external wallets, use the wallet's provider
        console.log('🔄 [UI] Using external wallet provider for signing...');
        const externalWallet = wallets.find((w) => w.address === walletAddress);
        if (!externalWallet) {
          throw new Error("External wallet not found");
        }
        
        // For external wallets, use window.ethereum directly
        // getEthereumProvider() may not work correctly for all external wallets
        let provider: any = null;
        
        if (typeof window !== 'undefined') {
          const ethereum = (window as any).ethereum;
          if (ethereum) {
            // Handle case where ethereum might be an array of providers
            if (Array.isArray(ethereum)) {
              provider = ethereum[0];
              console.log(`🔄 [UI] Using first provider from window.ethereum array (${ethereum.length} providers found)`);
            } else if (ethereum.request) {
              provider = ethereum;
              console.log('🔄 [UI] Using window.ethereum as provider');
            } else {
              // Try to find a provider with request method
              const providers = ethereum.providers || [ethereum];
              provider = providers.find((p: any) => p && p.request);
              if (provider) {
                console.log('🔄 [UI] Found provider with request method');
              }
            }
          }
        }
        
        if (!provider || typeof provider.request !== 'function') {
          throw new Error("Could not get Ethereum provider with request method. Please ensure your wallet extension is installed and connected.");
        }
        
        // Ensure wallet is on Base network (chainId: 8453)
        const baseChainId = '0x2105'; // Base mainnet
        try {
          const currentChainId = await provider.request({ method: 'eth_chainId' });
          console.log(`🔄 [UI] Current chain ID: ${currentChainId}, Required: ${baseChainId}`);
          
          if (currentChainId !== baseChainId) {
            console.log('🔄 [UI] Switching to Base network...');
            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: baseChainId }],
              });
              console.log('✅ [UI] Switched to Base network');
            } catch (switchError: any) {
              // If the chain doesn't exist, add it
              if (switchError.code === 4902) {
                console.log('🔄 [UI] Base network not found, adding it...');
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: baseChainId,
                    chainName: 'Base',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org'],
                  }],
                });
                console.log('✅ [UI] Added Base network');
              } else {
                throw switchError;
              }
            }
          }
        } catch (chainError: any) {
          console.warn('⚠️ [UI] Could not check/switch chain:', chainError?.message || chainError);
          // Continue anyway - the transaction will fail if wrong network
        }
        
        // Prepare transaction for external wallet
        // Some wallets (like Rabby) require 'from' field and are sensitive to field formats
        const txForWallet: any = { ...formattedTx };
        
        // CRITICAL: Ensure 'from' field is ALWAYS present BEFORE any other processing
        // Some wallets (like Rabby) call toLowerCase() on 'from' field, and if it's undefined, it crashes
        if (!walletAddress) {
          throw new Error("Wallet address is required but not found. Please ensure your wallet is properly connected.");
        }
        
        // Always set 'from' field first (required by Rabby and other wallets)
        txForWallet.from = walletAddress.toLowerCase();
        
        // Ensure all addresses are properly formatted (lowercase for consistency)
        // Wallets often normalize addresses with toLowerCase(), so ensure they're valid
        if (txForWallet.to) {
          txForWallet.to = typeof txForWallet.to === 'string' ? txForWallet.to.toLowerCase() : String(txForWallet.to).toLowerCase();
        }
        
        // Remove 'chainId' field (wallets determine chain from connected network)
        delete txForWallet.chainId;
        
        // Ensure all string values in txForWallet are properly formatted
        // Some wallets are sensitive to undefined/null/empty values
        const cleanedTx: any = {};
        
        // CRITICAL: Always include 'from' field first to ensure it's never missing
        cleanedTx.from = txForWallet.from;
        
        Object.keys(txForWallet).forEach(key => {
          // Skip 'from' since we already added it
          if (key === 'from') return;
          
          const value = txForWallet[key];
          if (value !== undefined && value !== null && value !== '') {
            cleanedTx[key] = value;
          }
        });
        
        // Final validation: ensure 'from' is present and is a valid string
        if (!cleanedTx.from || typeof cleanedTx.from !== 'string') {
          throw new Error(`Invalid 'from' field in transaction: ${cleanedTx.from}. Wallet address: ${walletAddress}`);
        }
        
        // Send transaction via external wallet
        // Log transaction with explicit 'from' field check
        console.log('🔄 [UI] Requesting wallet to sign and send transaction (popup will appear)...', {
          ...cleanedTx,
          _debug_hasFrom: !!cleanedTx.from,
          _debug_fromType: typeof cleanedTx.from,
          _debug_fromValue: cleanedTx.from,
        });
        
        // Double-check provider has request method before calling
        if (!provider || typeof provider.request !== 'function') {
          throw new Error("Provider does not have a request method. Wallet may not be properly connected.");
        }
        
        try {
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [cleanedTx],
          });
          
          console.log('✅ [UI] Transaction sent via external wallet. Hash:', txHash);
          
          // Save to database
          try {
          // Use optimal params from pendingTrade (already calculated in handleTrade)
          const finalCollateral = trade.collateral || optimalParams.collateral;
          const finalLeverage = trade.leverage || optimalParams.leverage;

          const result = await executeTrade({
            ...trade,
            collateral: finalCollateral, // Minimum collateral
            leverage: finalLeverage, // Maximum leverage
            takeProfit: 100,
            stopLoss: null,
            userId,
            txHash: txHash,
            pairIndex: txData.pair_index,
            tradeIndex: txData.trade_index,
            entryPrice: txData.entry_price,
          }) as { success: boolean; trade: Record<string, unknown> };
            
            if (result.success) {
              const tradeData = result.trade;
              addTrade(tradeData);
              
              const entryPrice = tradeData.entryPrice as number;
              toast.success(
                `${trade.direction.toUpperCase()} ${trade.market} opened! Entry: $${entryPrice?.toFixed(2)}`,
                { 
                  duration: 5000,
                  description: txHash ? `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}` : undefined
                }
              );
            }
          } catch (saveError: any) {
            console.warn('⚠️ [UI] Trade executed on-chain but failed to save:', saveError);
            // Still show success since transaction was sent
            toast.success(
              `${trade.direction.toUpperCase()} ${trade.market} transaction sent!`,
              { 
                duration: 5000,
                description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
              }
            );
          }
        } catch (requestError: any) {
          // Better error handling for provider.request errors
          const errorMessage = requestError?.message || String(requestError);
          console.error('❌ [UI] Provider request error:', errorMessage);
          
          // Try to provide more helpful error message
          if (errorMessage.includes('toLowerCase') || errorMessage.includes('undefined')) {
            throw new Error(`Wallet provider error: ${errorMessage}. Please ensure your wallet is properly connected and try again.`);
          }
          throw requestError;
        }
      }
    } catch (error) {
      console.error('❌ [UI] Trade execution failed:', error);
      toast.error("Failed to execute trade. Please try again.");
    } finally {
      setExecuting(false);
      setShowConfirmation(false);
      setPendingTrade(null);
    }
  };


  // Loading state
  if (!ready) {
    return <LoadingPage />;
  }

  // Check if user has wallet (authenticated or guest)
  const hasWallet = user?.wallet?.address || authenticated;

  // Not authenticated and no guest wallet - show login prompt
  if (!hasWallet && ready) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
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
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              mb: 3,
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 48 }} />
          </Avatar>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            SwipeTrader
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mb: 4 }}
          >
            Swipe through news and trade instantly on Avantis DEX
          </Typography>
          <Stack spacing={2} sx={{ width: "100%", maxWidth: 360 }}>
            <Button
              variant="contained"
              size="large"
              onClick={login}
              sx={{ py: 1.5 }}
            >
              Connect Wallet
            </Button>
            <Button
              variant="outlined"
              size="large"
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
        pb: "100px", // Space for bottom nav
      }}
    >
      {/* Category filter */}
      <CategoryFilter
        currentCategory={currentCategory}
        onCategoryChange={setCategory}
      />

      {/* Refresh timer */}
      <RefreshTimer
        cacheExpiresAt={cacheExpiresAt}
        refreshIntervalMinutes={15}
        onRefresh={handleRefresh}
      />

      {/* Swipe container */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 0,
        }}
      >
        <SwipeContainer
          news={
            currentCategory === "Trending"
              ? news
              : news.filter((n: { category?: string }) => n.category === currentCategory)
          }
          onTrade={handleTrade}
          onMarketClosed={handleMarketClosed}
        />
      </Box>

      {/* Confirmation modal - shows trade details, triggers signing on confirm */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        trade={pendingTrade}
        isLoading={isExecuting}
      />

      {/* Bottom navigation */}
      <BottomNav />
    </Box>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <SwipePage />
    </ToastProvider>
  );
}
