/**
 * Type definitions for SwipeTrader
 */

export type Tier = 'A' | 'B';

export interface NewsItem {
  id: string;
  headline: string;
  brief: string;
  source: string;
  publishedAt: string;          // RSS timestamp (unreliable - may be delayed/batched)
  firstSeenAt?: string;          // When OUR system first observed this item (the clock we control)
  url?: string;
  category?: string;
  imageUrl?: string | null;
  relevantPairs?: string[];      // Trading pairs this news is relevant to (legacy)
  // New tiering fields
  primaryAsset?: string;        // Single asset (e.g., "BTC/USD") - only Avantis-tradable
  assetConfidence?: number;      // 0-100
  isProxyAsset?: boolean;        // Whether primaryAsset is a proxy
  tier?: Tier;                   // A or B
  expiresAt?: string;            // firstSeenAt + 30 minutes
}

export interface Trade {
  id: string;
  newsId: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
  collateral: number;
  leverage: number;
  entryPrice: number;
  currentPrice?: number;
  exitPrice?: number;
  takeProfit: number;
  stopLoss: number | null;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
  closedAt?: string;
  status: "active" | "closed";
  marketIsOpen?: boolean;
  pairIndex?: number;
  tradeIndex?: number;
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export interface UserSettings {
  collateralSetting: number;
  showConfirmations: boolean;
  hasCompletedOnboarding: boolean;
}

export type InteractionType = "dismissed" | "longed" | "shorted";

export interface MarketDetectionResult {
  market: string;
  confidence: number;
  matchedKeywords: string[];
}

export interface MarketHoursResult {
  isOpen: boolean;
  message: string;
  category?: string;
}

export interface PendingTrade {
  newsId: string;
  newsHeadline: string;
  market: string;
  direction: "long" | "short";
}
