/**
 * Avantis DEX Contract Configuration
 * 
 * DEPRECATED: This file is kept for reference only.
 * Actual trading is handled by the Python FastAPI service using Avantis SDK.
 * The SDK handles contract addresses internally on Base network.
 * 
 * Base Mainnet Chain ID: 8453
 */

import { Address } from 'viem';

/**
 * Base Mainnet Chain ID
 */
export const BASE_CHAIN_ID = 8453;

/**
 * USDC token address on Arbitrum One
 * This is the standard USDC contract address
 */
export const USDC_ADDRESS: Address = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

/**
 * Avantis DEX Contract Addresses
 * TODO: Replace with actual addresses from Avantis DEX
 */
export const AVANTIS_CONTRACTS = {
  /**
   * Main trading contract address
   * This is where positions are opened/closed
   */
  TRADING_CONTRACT: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update
  
  /**
   * Price oracle contract address
   * Used to fetch current market prices
   */
  PRICE_ORACLE: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update
  
  /**
   * Vault contract address
   * Handles collateral deposits and withdrawals
   */
  VAULT: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update
};

/**
 * Default leverage multiplier (75x)
 */
export const DEFAULT_LEVERAGE = 75;

/**
 * Minimum collateral amount (in USDC, 6 decimals)
 */
export const MIN_COLLATERAL = 1_000_000n; // 1 USDC (6 decimals)

/**
 * Maximum leverage allowed
 */
export const MAX_LEVERAGE = 75;

/**
 * Avantis Trading Contract ABI
 * TODO: Replace with actual ABI from Avantis DEX
 */
export const TRADING_CONTRACT_ABI = [
  /**
   * Open a position
   * @param market - Market identifier (e.g., "BTC/USD")
   * @param direction - 0 for long, 1 for short
   * @param collateral - Collateral amount in USDC (6 decimals)
   * @param leverage - Leverage multiplier (1-75)
   * @param takeProfit - Take profit percentage (optional)
   * @param stopLoss - Stop loss percentage (optional)
   */
  {
    name: 'openPosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'market', type: 'string' },
      { name: 'direction', type: 'uint8' }, // 0 = long, 1 = short
      { name: 'collateral', type: 'uint256' },
      { name: 'leverage', type: 'uint256' },
      { name: 'takeProfit', type: 'uint256' },
      { name: 'stopLoss', type: 'uint256' },
    ],
    outputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'entryPrice', type: 'uint256' },
    ],
  },
  /**
   * Close a position
   * @param positionId - Position ID to close
   */
  {
    name: 'closePosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'positionId', type: 'uint256' },
    ],
    outputs: [
      { name: 'exitPrice', type: 'uint256' },
      { name: 'pnl', type: 'int256' },
    ],
  },
  /**
   * Get position details
   * @param positionId - Position ID
   */
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'positionId', type: 'uint256' },
    ],
    outputs: [
      { name: 'user', type: 'address' },
      { name: 'market', type: 'string' },
      { name: 'direction', type: 'uint8' },
      { name: 'collateral', type: 'uint256' },
      { name: 'leverage', type: 'uint256' },
      { name: 'entryPrice', type: 'uint256' },
      { name: 'currentPrice', type: 'uint256' },
      { name: 'pnl', type: 'int256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  /**
   * Get user's active positions
   * @param user - User address
   */
  {
    name: 'getUserPositions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'positionIds', type: 'uint256[]' },
    ],
  },
] as const;

/**
 * USDC ERC20 ABI (for approvals)
 */
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

/**
 * Price Oracle ABI
 * TODO: Replace with actual ABI
 */
export const PRICE_ORACLE_ABI = [
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'market', type: 'string' },
    ],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    name: 'getPrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'markets', type: 'string[]' },
    ],
    outputs: [
      { name: 'prices', type: 'uint256[]' },
      { name: 'timestamps', type: 'uint256[]' },
    ],
  },
] as const;

