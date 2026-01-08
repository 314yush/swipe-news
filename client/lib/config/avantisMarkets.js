/**
 * All supported markets on Avantis DEX
 * Grouped by category for easier management
 */
export const AVANTIS_MARKETS = {
  CRYPTO: [
    'BTC/USD',
    'ETH/USD',
    'SOL/USD',
    'BNB/USD',
    'XRP/USD',
    'ADA/USD',
    'DOGE/USD',
    'AVAX/USD',
    'DOT/USD',
    'MATIC/USD',
    'LINK/USD',
    'UNI/USD',
    'ATOM/USD',
    'LTC/USD',
    'ETC/USD',
    'XLM/USD',
    'NEAR/USD',
    'APE/USD',
    'ARB/USD',
    'OP/USD',
    'FTM/USD',
    'AAVE/USD',
    'CRV/USD',
    'MKR/USD',
    'SNX/USD',
    'COMP/USD',
    'SUSHI/USD',
    'YFI/USD',
    'PEPE/USD',
    'SHIB/USD',
    'WIF/USD',
    'BONK/USD',
  ],
  FOREX: [
    'EUR/USD',
    'USD/JPY',
    'GBP/USD',
    'USD/CHF',
    'AUD/USD',
    'USD/CAD',
    'NZD/USD',
    'EUR/GBP',
    'EUR/JPY',
    'GBP/JPY',
  ],
  COMMODITIES: [
    'XAU/USD',  // Gold
    'XAG/USD',  // Silver
    'USOILSPOT/USD',  // WTI Crude Oil
    'UKOILSPOT/USD',  // Brent Crude Oil
    'XCU/USD',  // Copper
    'XPTUSD',   // Platinum
    'XPDUSD',   // Palladium
  ],
  STOCKS: [
    'AAPL/USD',
    'MSFT/USD',
    'GOOGL/USD',
    'AMZN/USD',
    'NVDA/USD',
    'META/USD',
    'TSLA/USD',
    'AMD/USD',
    'NFLX/USD',
    'DIS/USD',
    'PYPL/USD',
    'INTC/USD',
    'CRM/USD',
    'ADBE/USD',
    'ORCL/USD',
    'IBM/USD',
    'CSCO/USD',
    'QCOM/USD',
    'TXN/USD',
    'AVGO/USD',
    'MU/USD',
    'COIN/USD',
    'SQ/USD',
    'SHOP/USD',
    'UBER/USD',
    'LYFT/USD',
    'SNAP/USD',
    'PINS/USD',
    'TWTR/USD',
    'ZM/USD',
    'DOCU/USD',
    'PLTR/USD',
    'RBLX/USD',
    'HOOD/USD',
    'SOFI/USD',
  ],
  INDICES: [
    'SPX/USD',   // S&P 500
    'NDX/USD',   // Nasdaq 100
    'DJI/USD',   // Dow Jones
    'RUT/USD',   // Russell 2000
    'VIX/USD',   // Volatility Index
  ],
};

/**
 * Flatten all markets into a single array
 */
export const ALL_MARKETS = Object.values(AVANTIS_MARKETS).flat();

/**
 * Get market category by market pair
 * @param {string} market - Market pair (e.g., 'BTC/USD')
 * @returns {string|null} Category name or null if not found
 */
export function getMarketCategory(market) {
  for (const [category, markets] of Object.entries(AVANTIS_MARKETS)) {
    if (markets.includes(market)) {
      return category;
    }
  }
  return null;
}

/**
 * Check if a market is supported
 * @param {string} market - Market pair to check
 * @returns {boolean} Whether the market is supported
 */
export function isMarketSupported(market) {
  return ALL_MARKETS.includes(market);
}

/**
 * Default market when detection fails
 */
export const DEFAULT_MARKET = 'BTC/USD';

export default AVANTIS_MARKETS;







