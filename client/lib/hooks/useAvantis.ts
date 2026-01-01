// @ts-nocheck
/**
 * React hook for Avantis DEX integration
 * 
 * DEPRECATED: This hook is no longer used.
 * Trading is now handled by the Python FastAPI service via Supabase Edge Functions.
 * 
 * Use the API service (lib/services/api.js) instead, which calls Edge Functions
 * that proxy to the Python trading service.
 * 
 * This file is kept for reference only and may be removed in the future.
 * 
 * @deprecated Use executeTrade() and closeTrade() from lib/services/api.js instead.
 */

import { useCallback, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// @ts-ignore - Deprecated hook, these imports may not exist in current version
// import { useWalletClient, usePublicClient } from '@privy-io/wagmi';
import {
  AvantisService,
  openPosition,
  closePosition,
  getMarketPrice,
  getMarketPrices,
  getUSDCBalance,
  checkUSDCApproval,
  approveUSDC,
  getPosition,
  getUserPositions,
} from '../services/avantis';
import type { Address, Hash } from 'viem';

export interface UseAvantisReturn {
  // State
  isLoading: boolean;
  error: string | null;
  usdcBalance: number | null;
  
  // Actions
  openTrade: (
    market: string,
    direction: 'long' | 'short',
    collateral: number,
    leverage?: number,
    takeProfit?: number,
    stopLoss?: number
  ) => Promise<{ positionId: bigint; entryPrice: number; txHash: Hash } | null>;
  closeTrade: (positionId: bigint) => Promise<{ exitPrice: number; pnl: number; txHash: Hash } | null>;
  fetchPrice: (market: string) => Promise<number | null>;
  fetchPrices: (markets: string[]) => Promise<Record<string, number>>;
  refreshBalance: () => Promise<void>;
  checkApproval: (amount: number) => Promise<boolean>;
  requestApproval: (amount: number) => Promise<Hash | null>;
  getUserActivePositions: () => Promise<bigint[]>;
  getPositionDetails: (positionId: bigint) => Promise<any>;
}

/**
 * Hook for interacting with Avantis DEX
 */
export function useAvantis(): UseAvantisReturn {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  // @ts-ignore - Deprecated hook
  const walletClient = null; // useWalletClient() is not available
  // @ts-ignore - Deprecated hook
  const publicClient = null; // usePublicClient() is not available

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  /**
   * Get the user's wallet address
   */
  const getWalletAddress = useCallback((): Address | null => {
    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
    return embeddedWallet?.address as Address | null;
  }, [wallets]);

  /**
   * Refresh USDC balance
   */
  const refreshBalance = useCallback(async () => {
    if (!publicClient) return;

    const address = getWalletAddress();
    if (!address) {
      setUsdcBalance(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const balance = await getUSDCBalance(publicClient, address);
      setUsdcBalance(balance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Error fetching USDC balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, getWalletAddress]);

  /**
   * Check if USDC approval is sufficient
   */
  const checkApproval = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!publicClient) return false;

      const address = getWalletAddress();
      if (!address) return false;

      try {
        // Convert amount to wei (6 decimals for USDC)
        const { parseUnits } = await import('viem');
        const amountInWei = parseUnits(amount.toString(), 6);
        return await checkUSDCApproval(publicClient, address, amountInWei);
      } catch (err) {
        console.error('Error checking approval:', err);
        return false;
      }
    },
    [publicClient, getWalletAddress]
  );

  /**
   * Request USDC approval
   */
  const requestApproval = useCallback(
    async (amount: number): Promise<Hash | null> => {
      if (!walletClient) {
        setError('Wallet not connected');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);
        const hash = await approveUSDC(walletClient, amount);
        return hash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to approve USDC';
        setError(errorMessage);
        console.error('Error approving USDC:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient]
  );

  /**
   * Open a trade position
   */
  const openTrade = useCallback(
    async (
      market: string,
      direction: 'long' | 'short',
      collateral: number,
      leverage: number = 75,
      takeProfit?: number,
      stopLoss?: number
    ): Promise<{ positionId: bigint; entryPrice: number; txHash: Hash } | null> => {
      if (!walletClient) {
        setError('Wallet not connected');
        return null;
      }

      if (!ready || !authenticated) {
        setError('Please connect your wallet first');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check if approval is needed
        const hasApproval = await checkApproval(collateral);
        if (!hasApproval) {
          // Request approval first
          const approvalHash = await requestApproval(collateral);
          if (!approvalHash) {
            throw new Error('Failed to approve USDC');
          }

          // Wait for approval transaction to be mined
          if (publicClient) {
            await (publicClient as any).waitForTransactionReceipt({ hash: approvalHash });
          }
        }

        // Open the position
        const result = await openPosition(
          walletClient,
          market,
          direction,
          collateral,
          leverage,
          takeProfit,
          stopLoss
        );

        // Refresh balance after trade
        await refreshBalance();

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open trade';
        setError(errorMessage);
        console.error('Error opening trade:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, ready, authenticated, checkApproval, requestApproval, publicClient, refreshBalance]
  );

  /**
   * Close a trade position
   */
  const closeTrade = useCallback(
    async (positionId: bigint): Promise<{ exitPrice: number; pnl: number; txHash: Hash } | null> => {
      if (!walletClient) {
        setError('Wallet not connected');
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const result = await closePosition(walletClient, positionId);

        // Refresh balance after closing
        await refreshBalance();

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to close trade';
        setError(errorMessage);
        console.error('Error closing trade:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [walletClient, refreshBalance]
  );

  /**
   * Fetch price for a single market
   */
  const fetchPrice = useCallback(
    async (market: string): Promise<number | null> => {
      if (!publicClient) return null;

      try {
        return await getMarketPrice(publicClient, market);
      } catch (err) {
        console.error('Error fetching price:', err);
        return null;
      }
    },
    [publicClient]
  );

  /**
   * Fetch prices for multiple markets
   */
  const fetchPrices = useCallback(
    async (markets: string[]): Promise<Record<string, number>> => {
      if (!publicClient) return {};

      try {
        return await getMarketPrices(publicClient, markets);
      } catch (err) {
        console.error('Error fetching prices:', err);
        return {};
      }
    },
    [publicClient]
  );

  /**
   * Get user's active positions
   */
  const getUserActivePositions = useCallback(async (): Promise<bigint[]> => {
    if (!publicClient) return [];

    const address = getWalletAddress();
    if (!address) return [];

    try {
      return await getUserPositions(publicClient, address);
    } catch (err) {
      console.error('Error fetching user positions:', err);
      return [];
    }
  }, [publicClient, getWalletAddress]);

  /**
   * Get position details
   */
  const getPositionDetails = useCallback(
    async (positionId: bigint): Promise<any> => {
      if (!publicClient) return null;

      try {
        return await getPosition(publicClient, positionId);
      } catch (err) {
        console.error('Error fetching position details:', err);
        return null;
      }
    },
    [publicClient]
  );

  return {
    isLoading,
    error,
    usdcBalance,
    openTrade,
    closeTrade,
    fetchPrice,
    fetchPrices,
    refreshBalance,
    checkApproval,
    requestApproval,
    getUserActivePositions,
    getPositionDetails,
  };
}

