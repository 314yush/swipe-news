// @ts-nocheck
/**
 * Avantis DEX Service
 * 
 * DEPRECATED: This file is no longer used.
 * Trading is now handled by the Python FastAPI service (server/trading-service/)
 * which uses the Avantis SDK and Privy for server-side transaction signing.
 * 
 * This file is kept for reference only and may be removed in the future.
 * 
 * @deprecated Use Edge Functions that call the Python trading service instead.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  type Address,
  type Hash,
  type WalletClient,
  type PublicClient,
} from 'viem';
import { base } from 'viem/chains';
import {
  AVANTIS_CONTRACTS,
  TRADING_CONTRACT_ABI,
  ERC20_ABI,
  PRICE_ORACLE_ABI,
  USDC_ADDRESS,
  DEFAULT_LEVERAGE,
  MIN_COLLATERAL,
} from '../contracts/avantis';

/**
 * USDC has 6 decimals
 */
const USDC_DECIMALS = 6;

/**
 * Create a public client for reading from the blockchain
 */
function createPublicClientInstance(): PublicClient {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

/**
 * Create a wallet client from Privy's embedded wallet
 * @param account - Account from Privy
 * @param transport - Transport provider (from Privy)
 */
function createWalletClientInstance(
  account: Address,
  transport: any
): WalletClient {
  return createWalletClient({
    account,
    chain: base,
    transport,
  });
}

/**
 * Check if USDC approval is sufficient
 * @param publicClient - Public client instance
 * @param owner - User's wallet address
 * @param amount - Amount to check approval for
 */
export async function checkUSDCApproval(
  publicClient: PublicClient,
  owner: Address,
  amount: bigint
): Promise<boolean> {
  try {
    const allowance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, AVANTIS_CONTRACTS.TRADING_CONTRACT],
    });

    return allowance >= amount;
  } catch (error) {
    console.error('Error checking USDC approval:', error);
    return false;
  }
}

/**
 * Approve USDC spending for Avantis trading contract
 * @param walletClient - Wallet client instance
 * @param amount - Amount to approve (in USDC, will be converted to 6 decimals)
 */
export async function approveUSDC(
  walletClient: WalletClient,
  amount: number
): Promise<Hash> {
  const amountInWei = parseUnits(amount.toString(), USDC_DECIMALS);

  const hash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [AVANTIS_CONTRACTS.TRADING_CONTRACT, amountInWei],
  });

  return hash;
}

/**
 * Get USDC balance for a user
 * @param publicClient - Public client instance
 * @param address - User's wallet address
 */
export async function getUSDCBalance(
  publicClient: PublicClient,
  address: Address
): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    return parseFloat(formatUnits(balance, USDC_DECIMALS));
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

/**
 * Get current price for a market
 * @param publicClient - Public client instance
 * @param market - Market pair (e.g., "BTC/USD")
 */
export async function getMarketPrice(
  publicClient: PublicClient,
  market: string
): Promise<number | null> {
  try {
    // TODO: Update once contract address is known
    if (AVANTIS_CONTRACTS.PRICE_ORACLE === '0x0000000000000000000000000000000000000000') {
      console.warn('Price oracle contract not configured');
      return null;
    }

    const result = await publicClient.readContract({
      address: AVANTIS_CONTRACTS.PRICE_ORACLE,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getPrice',
      args: [market],
    });

    // Price is typically returned as an integer with 8 decimals
    // Adjust based on actual contract implementation
    const price = parseFloat(formatUnits(result[0] as bigint, 8));
    return price;
  } catch (error) {
    console.error('Error fetching market price:', error);
    return null;
  }
}

/**
 * Get prices for multiple markets
 * @param publicClient - Public client instance
 * @param markets - Array of market pairs
 */
export async function getMarketPrices(
  publicClient: PublicClient,
  markets: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  try {
    if (AVANTIS_CONTRACTS.PRICE_ORACLE === '0x0000000000000000000000000000000000000000') {
      console.warn('Price oracle contract not configured');
      return prices;
    }

    const result = await publicClient.readContract({
      address: AVANTIS_CONTRACTS.PRICE_ORACLE,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getPrices',
      args: [markets],
    });

    const priceValues = result[0] as bigint[];
    
    markets.forEach((market, index) => {
      prices[market] = parseFloat(formatUnits(priceValues[index], 8));
    });
  } catch (error) {
    console.error('Error fetching market prices:', error);
  }

  return prices;
}

/**
 * Open a position on Avantis DEX
 * @param walletClient - Wallet client instance
 * @param market - Market pair (e.g., "BTC/USD")
 * @param direction - "long" or "short"
 * @param collateral - Collateral amount in USDC
 * @param leverage - Leverage multiplier (default: 75)
 * @param takeProfit - Take profit percentage (optional)
 * @param stopLoss - Stop loss percentage (optional)
 */
export async function openPosition(
  walletClient: WalletClient,
  market: string,
  direction: 'long' | 'short',
  collateral: number,
  leverage: number = DEFAULT_LEVERAGE,
  takeProfit?: number,
  stopLoss?: number
): Promise<{ positionId: bigint; entryPrice: number; txHash: Hash }> {
  // Validate contract address
  if (AVANTIS_CONTRACTS.TRADING_CONTRACT === '0x0000000000000000000000000000000000000000') {
    throw new Error('Avantis trading contract not configured. Please update contract addresses.');
  }

  // Convert collateral to wei (6 decimals for USDC)
  const collateralInWei = parseUnits(collateral.toString(), USDC_DECIMALS);

  // Validate minimum collateral
  if (collateralInWei < MIN_COLLATERAL) {
    throw new Error(`Collateral must be at least ${formatUnits(MIN_COLLATERAL, USDC_DECIMALS)} USDC`);
  }

  // Convert direction to uint8 (0 = long, 1 = short)
  const directionValue = direction === 'long' ? 0 : 1;

  // Convert take profit and stop loss to basis points if provided
  const takeProfitBps = takeProfit ? BigInt(Math.floor(takeProfit * 100)) : 0n;
  const stopLossBps = stopLoss ? BigInt(Math.floor(stopLoss * 100)) : 0n;

  // Execute the transaction
  const hash = await walletClient.writeContract({
    address: AVANTIS_CONTRACTS.TRADING_CONTRACT,
    abi: TRADING_CONTRACT_ABI,
    functionName: 'openPosition',
    args: [
      market,
      directionValue,
      collateralInWei,
      BigInt(leverage),
      takeProfitBps,
      stopLossBps,
    ],
  });

  // Wait for transaction receipt to get position ID and entry price
  const publicClient = createPublicClientInstance();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract position ID and entry price from transaction logs
  // TODO: Update based on actual event structure
  let positionId = 0n;
  let entryPrice = 0;

  // For now, we'll need to query the contract to get the position details
  // This is a placeholder - actual implementation depends on contract events
  const positionIdFromLogs = receipt.logs.find((log) => {
    // Parse logs to find position creation event
    // TODO: Implement based on actual event structure
    return false;
  });

  // If we can't get it from logs, we'll need to query the user's latest position
  // This is a fallback approach
  if (positionId === 0n) {
    const account = walletClient.account?.address;
    if (account) {
      const positions = await getUserPositions(publicClient, account);
      if (positions.length > 0) {
        positionId = positions[positions.length - 1];
      }
    }
  }

  // Get entry price from position
  if (positionId > 0n) {
    const position = await getPosition(publicClient, positionId);
    entryPrice = position.entryPrice;
  }

  return {
    positionId,
    entryPrice,
    txHash: hash,
  };
}

/**
 * Close a position
 * @param walletClient - Wallet client instance
 * @param positionId - Position ID to close
 */
export async function closePosition(
  walletClient: WalletClient,
  positionId: bigint
): Promise<{ exitPrice: number; pnl: number; txHash: Hash }> {
  if (AVANTIS_CONTRACTS.TRADING_CONTRACT === '0x0000000000000000000000000000000000000000') {
    throw new Error('Avantis trading contract not configured. Please update contract addresses.');
  }

  const hash = await walletClient.writeContract({
    address: AVANTIS_CONTRACTS.TRADING_CONTRACT,
    abi: TRADING_CONTRACT_ABI,
    functionName: 'closePosition',
    args: [positionId],
  });

  // Wait for transaction receipt
  const publicClient = createPublicClientInstance();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract exit price and P&L from logs
  // TODO: Parse actual event logs
  let exitPrice = 0;
  let pnl = 0;

  // Fallback: query the position to get final values
  // This is a placeholder - actual implementation depends on contract events
  const position = await getPosition(publicClient, positionId);
  exitPrice = position.currentPrice;
  pnl = position.pnl;

  return {
    exitPrice,
    pnl,
    txHash: hash,
  };
}

/**
 * Get position details
 * @param publicClient - Public client instance
 * @param positionId - Position ID
 */
export async function getPosition(
  publicClient: PublicClient,
  positionId: bigint
): Promise<{
  user: Address;
  market: string;
  direction: 'long' | 'short';
  collateral: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  isActive: boolean;
}> {
  if (AVANTIS_CONTRACTS.TRADING_CONTRACT === '0x0000000000000000000000000000000000000000') {
    throw new Error('Avantis trading contract not configured.');
  }

  const result = await publicClient.readContract({
    address: AVANTIS_CONTRACTS.TRADING_CONTRACT,
    abi: TRADING_CONTRACT_ABI,
    functionName: 'getPosition',
    args: [positionId],
  });

  return {
    user: result[0] as Address,
    market: result[1] as string,
    direction: (result[2] as number) === 0 ? 'long' : 'short',
    collateral: parseFloat(formatUnits(result[3] as bigint, USDC_DECIMALS)),
    leverage: Number(result[4] as bigint),
    entryPrice: parseFloat(formatUnits(result[5] as bigint, 8)),
    currentPrice: parseFloat(formatUnits(result[6] as bigint, 8)),
    pnl: parseFloat(formatUnits(result[7] as bigint, USDC_DECIMALS)),
    isActive: result[8] as boolean,
  };
}

/**
 * Get user's active positions
 * @param publicClient - Public client instance
 * @param userAddress - User's wallet address
 */
export async function getUserPositions(
  publicClient: PublicClient,
  userAddress: Address
): Promise<bigint[]> {
  if (AVANTIS_CONTRACTS.TRADING_CONTRACT === '0x0000000000000000000000000000000000000000') {
    return [];
  }

  try {
    const positionIds = await publicClient.readContract({
      address: AVANTIS_CONTRACTS.TRADING_CONTRACT,
      abi: TRADING_CONTRACT_ABI,
      functionName: 'getUserPositions',
      args: [userAddress],
    });

    return positionIds as bigint[];
  } catch (error) {
    console.error('Error fetching user positions:', error);
    return [];
  }
}

/**
 * Helper to create clients from Privy
 * This should be called from React components with Privy hooks
 */
export const AvantisService = {
  checkUSDCApproval,
  approveUSDC,
  getUSDCBalance,
  getMarketPrice,
  getMarketPrices,
  openPosition,
  closePosition,
  getPosition,
  getUserPositions,
  createPublicClientInstance,
  createWalletClientInstance,
};

