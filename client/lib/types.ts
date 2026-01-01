/**
 * Type definitions for SwipeTrader
 */

export interface NewsItem {
  id: string;
  headline: string;
  brief: string;
  source: string;
  publishedAt: string;
  url?: string;
  category?: string;
  imageUrl?: string | null;
  relevantPairs?: string[]; // Trading pairs this news is relevant to (e.g., ["BTC/USD", "ETH/USD"])
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


