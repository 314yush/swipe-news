/**
 * Avantis Trading Pairs Configuration
 * Maps trading pairs to keywords for news matching
 * 
 * Includes proxy assets for capturing general market news:
 * - BTC/USD: General crypto market news
 * - SPY/USD: General stock market news
 * - XAU/USD: Safe-haven / macro news
 * - USOILSPOT/USD: Energy sector news
 */

export interface TradingPair {
  category: 'CRYPTO' | 'FOREX' | 'COMMODITIES' | 'OTHER';
  pair: string;
  base: string; // e.g., BTC from BTC/USD
  keywords: string[]; // Keywords to match in news
  isProxy?: boolean; // True if this is a proxy asset for general market news
}

export interface AssetMatch {
  pair: string;
  confidence: number; // 0-100
  matchedKeywords: string[];
  isProxy: boolean;
  category: TradingPair['category'];
}

// Extract base symbols and create keyword mappings
// Note: Proxy assets are listed first with isProxy: true for general market news
export const TRADING_PAIRS: TradingPair[] = [
  // ===========================================
  // PROXY ASSETS - Capture general market news
  // ===========================================
  
  // BTC as proxy for general crypto market news
  { 
    category: 'CRYPTO', 
    pair: 'BTC/USD', 
    base: 'BTC', 
    keywords: [
      'bitcoin', 'btc', 
      // General crypto market keywords
      'crypto market', 'cryptocurrency market', 'digital assets', 'crypto rally', 
      'crypto crash', 'crypto regulation', 'sec crypto', 'crypto etf', 'crypto prices',
      'cryptocurrency prices', 'crypto trading', 'crypto investors', 'crypto selloff',
      'crypto surge', 'crypto plunge', 'cryptocurrency rally', 'cryptocurrency crash'
    ],
    isProxy: true 
  },
  
  // SPY as proxy for general stock market news
  { 
    category: 'OTHER', 
    pair: 'SPY/USD', 
    base: 'SPY', 
    keywords: [
      'spy', 's&p 500', 'sp500', 's&p500',
      // General stock market keywords
      'stock market', 'stocks rally', 'stocks fall', 'wall street', 'equities',
      'dow jones', 'nasdaq', 'market rally', 'market crash', 'fed rate', 'fomc',
      'interest rate', 'rate hike', 'rate cut', 'federal reserve', 'powell',
      'stock prices', 'equity markets', 'market selloff', 'market surge',
      'stocks surge', 'stocks plunge', 'market correction', 'bull market', 'bear market'
    ],
    isProxy: true 
  },
  
  // XAU as proxy for safe-haven / macro news
  { 
    category: 'COMMODITIES', 
    pair: 'XAU/USD', 
    base: 'GOLD', 
    keywords: [
      'gold', 'xau', 'precious metals',
      // Safe-haven and macro keywords
      'safe haven', 'gold price', 'bullion', 'gold rally', 'gold surge',
      'inflation hedge', 'gold reserves', 'central bank gold'
    ],
    isProxy: true 
  },
  
  // OIL as proxy for energy sector news
  { 
    category: 'COMMODITIES', 
    pair: 'USOILSPOT/USD', 
    base: 'OIL', 
    keywords: [
      'oil', 'crude', 'wti', 'brent', 'petroleum', 'energy prices',
      // Energy sector keywords
      'opec', 'oil price', 'crude oil', 'oil rally', 'oil surge', 'oil crash',
      'gasoline', 'fuel prices', 'energy crisis', 'oil production', 'oil supply'
    ],
    isProxy: true 
  },
  
  // ===========================================
  // SPECIFIC ASSETS - Direct ticker matches
  // ===========================================
  
  // CRYPTO
  { category: 'CRYPTO', pair: 'APT/USD', base: 'APT', keywords: ['aptos', 'apt'] },
  { category: 'CRYPTO', pair: 'ARB/USD', base: 'ARB', keywords: ['arbitrum', 'arb'] },
  { category: 'CRYPTO', pair: 'AVAX/USD', base: 'AVAX', keywords: ['avalanche', 'avax'] },
  { category: 'CRYPTO', pair: 'BNB/USD', base: 'BNB', keywords: ['binance', 'bnb', 'binance coin'] },
  { category: 'CRYPTO', pair: 'DOGE/USD', base: 'DOGE', keywords: ['dogecoin', 'doge'] },
  { category: 'CRYPTO', pair: 'ETH/USD', base: 'ETH', keywords: ['ethereum', 'eth', 'ether', 'vitalik'] },
  { category: 'CRYPTO', pair: 'ETHFI/USD', base: 'ETHFI', keywords: ['ethfi', 'ethereum fi'] },
  { category: 'CRYPTO', pair: 'FARTCOIN/USD', base: 'FARTCOIN', keywords: ['fartcoin'] },
  { category: 'CRYPTO', pair: 'HYPE/USD', base: 'HYPE', keywords: ['hype'] },
  { category: 'CRYPTO', pair: 'INJ/USD', base: 'INJ', keywords: ['injective', 'inj'] },
  { category: 'CRYPTO', pair: 'LINK/USD', base: 'LINK', keywords: ['chainlink', 'link'] },
  { category: 'CRYPTO', pair: 'NEAR/USD', base: 'NEAR', keywords: ['near', 'near protocol'] },
  { category: 'CRYPTO', pair: 'OP/USD', base: 'OP', keywords: ['optimism', 'op'] },
  { category: 'CRYPTO', pair: 'POPCAT/USD', base: 'POPCAT', keywords: ['popcat'] },
  { category: 'CRYPTO', pair: 'SEI/USD', base: 'SEI', keywords: ['sei'] },
  { category: 'CRYPTO', pair: 'SOL/USD', base: 'SOL', keywords: ['solana', 'sol'] },
  { category: 'CRYPTO', pair: 'SUI/USD', base: 'SUI', keywords: ['sui'] },
  { category: 'CRYPTO', pair: 'TIA/USD', base: 'TIA', keywords: ['celestia', 'tia'] },
  { category: 'CRYPTO', pair: 'XRP/USD', base: 'XRP', keywords: ['ripple', 'xrp'] },
  
  // FOREX
  { category: 'FOREX', pair: 'AUD/USD', base: 'AUD', keywords: ['australian dollar', 'aud', 'australia'] },
  { category: 'FOREX', pair: 'EUR/USD', base: 'EUR', keywords: ['euro', 'eur', 'european union', 'ecb', 'eurozone'] },
  { category: 'FOREX', pair: 'GBP/USD', base: 'GBP', keywords: ['british pound', 'gbp', 'sterling', 'uk', 'britain', 'bank of england'] },
  { category: 'FOREX', pair: 'NZD/USD', base: 'NZD', keywords: ['new zealand dollar', 'nzd'] },
  { category: 'FOREX', pair: 'USD/CAD', base: 'CAD', keywords: ['canadian dollar', 'cad', 'canada'] },
  { category: 'FOREX', pair: 'USD/CHF', base: 'CHF', keywords: ['swiss franc', 'chf', 'switzerland'] },
  { category: 'FOREX', pair: 'USD/JPY', base: 'JPY', keywords: ['japanese yen', 'jpy', 'japan', 'boj', 'bank of japan'] },
  { category: 'FOREX', pair: 'USD/MXN', base: 'MXN', keywords: ['mexican peso', 'mxn', 'mexico'] },
  { category: 'FOREX', pair: 'USD/SEK', base: 'SEK', keywords: ['swedish krona', 'sek', 'sweden'] },
  { category: 'FOREX', pair: 'USD/SGD', base: 'SGD', keywords: ['singapore dollar', 'sgd', 'singapore'] },
  { category: 'FOREX', pair: 'USD/ZAR', base: 'ZAR', keywords: ['south african rand', 'zar', 'south africa'] },
  
  // COMMODITIES (non-proxy)
  { category: 'COMMODITIES', pair: 'XAG/USD', base: 'SILVER', keywords: ['silver', 'xag'] },
  
  // OTHER - Stocks & Tokens
  { category: 'OTHER', pair: 'AAPL/USD', base: 'AAPL', keywords: ['apple', 'aapl', 'iphone', 'tim cook'] },
  { category: 'OTHER', pair: 'AAVE/USD', base: 'AAVE', keywords: ['aave'] },
  { category: 'OTHER', pair: 'AERO/USD', base: 'AERO', keywords: ['aero'] },
  { category: 'OTHER', pair: 'AMZN/USD', base: 'AMZN', keywords: ['amazon', 'amzn', 'aws', 'bezos'] },
  { category: 'OTHER', pair: 'APE/USD', base: 'APE', keywords: ['ape', 'apecoin'] },
  { category: 'OTHER', pair: 'ARKM/USD', base: 'ARKM', keywords: ['arkm'] },
  { category: 'OTHER', pair: 'ASTER/USD', base: 'ASTER', keywords: ['aster'] },
  { category: 'OTHER', pair: 'AVNT/USD', base: 'AVNT', keywords: ['avnt'] },
  { category: 'OTHER', pair: 'BERA/USD', base: 'BERA', keywords: ['bera'] },
  { category: 'OTHER', pair: 'BONK/USD', base: 'BONK', keywords: ['bonk'] },
  { category: 'OTHER', pair: 'BRETT/USD', base: 'BRETT', keywords: ['brett'] },
  { category: 'OTHER', pair: 'CHILLGUY/USD', base: 'CHILLGUY', keywords: ['chillguy'] },
  { category: 'OTHER', pair: 'COIN/USD', base: 'COIN', keywords: ['coinbase', 'coin'] },
  { category: 'OTHER', pair: 'DYM/USD', base: 'DYM', keywords: ['dym'] },
  { category: 'OTHER', pair: 'EIGEN/USD', base: 'EIGEN', keywords: ['eigen'] },
  { category: 'OTHER', pair: 'ENA/USD', base: 'ENA', keywords: ['ena'] },
  { category: 'OTHER', pair: 'FET/USD', base: 'FET', keywords: ['fetch', 'fet'] },
  { category: 'OTHER', pair: 'GOAT/USD', base: 'GOAT', keywords: ['goat'] },
  { category: 'OTHER', pair: 'GOOG/USD', base: 'GOOG', keywords: ['google', 'alphabet', 'goog', 'youtube'] },
  { category: 'OTHER', pair: 'HOOD/USD', base: 'HOOD', keywords: ['robinhood', 'hood'] },
  { category: 'OTHER', pair: 'JUP/USD', base: 'JUP', keywords: ['jupiter', 'jup'] },
  { category: 'OTHER', pair: 'KAITO/USD', base: 'KAITO', keywords: ['kaito'] },
  { category: 'OTHER', pair: 'LDO/USD', base: 'LDO', keywords: ['lido', 'ldo'] },
  { category: 'OTHER', pair: 'META/USD', base: 'META', keywords: ['meta', 'facebook', 'instagram', 'zuckerberg'] },
  { category: 'OTHER', pair: 'MON/USD', base: 'MON', keywords: ['mon'] },
  { category: 'OTHER', pair: 'MSFT/USD', base: 'MSFT', keywords: ['microsoft', 'msft', 'azure', 'satya nadella'] },
  { category: 'OTHER', pair: 'NVDA/USD', base: 'NVDA', keywords: ['nvidia', 'nvda', 'jensen huang', 'gpu'] },
  { category: 'OTHER', pair: 'ONDO/USD', base: 'ONDO', keywords: ['ondo'] },
  { category: 'OTHER', pair: 'ORDI/USD', base: 'ORDI', keywords: ['ordi'] },
  { category: 'OTHER', pair: 'PENDLE/USD', base: 'PENDLE', keywords: ['pendle'] },
  { category: 'OTHER', pair: 'PENGU/USD', base: 'PENGU', keywords: ['pengu'] },
  { category: 'OTHER', pair: 'PEPE/USD', base: 'PEPE', keywords: ['pepe'] },
  { category: 'OTHER', pair: 'POL/USD', base: 'POL', keywords: ['polygon', 'pol'] },
  { category: 'OTHER', pair: 'PUMP/USD', base: 'PUMP', keywords: ['pump'] },
  { category: 'OTHER', pair: 'QQQ/USD', base: 'QQQ', keywords: ['qqq', 'nasdaq etf'] },
  { category: 'OTHER', pair: 'RENDER/USD', base: 'RENDER', keywords: ['render', 'rndr'] },
  { category: 'OTHER', pair: 'REZ/USD', base: 'REZ', keywords: ['rez'] },
  { category: 'OTHER', pair: 'SHIB/USD', base: 'SHIB', keywords: ['shiba', 'shib', 'shiba inu'] },
  { category: 'OTHER', pair: 'STX/USD', base: 'STX', keywords: ['stacks', 'stx'] },
  { category: 'OTHER', pair: 'TAO/USD', base: 'TAO', keywords: ['tao', 'bittensor'] },
  { category: 'OTHER', pair: 'TRUMP/USD', base: 'TRUMP', keywords: ['trump'] },
  { category: 'OTHER', pair: 'TSLA/USD', base: 'TSLA', keywords: ['tesla', 'tsla', 'elon musk'] },
  { category: 'OTHER', pair: 'USD/BRL', base: 'BRL', keywords: ['brazilian real', 'brl', 'brazil'] },
  { category: 'OTHER', pair: 'USD/CNH', base: 'CNH', keywords: ['chinese yuan', 'cnh', 'yuan', 'china'] },
  { category: 'OTHER', pair: 'USD/IDR', base: 'IDR', keywords: ['indonesian rupiah', 'idr', 'indonesia'] },
  { category: 'OTHER', pair: 'USD/INR', base: 'INR', keywords: ['indian rupee', 'inr', 'india'] },
  { category: 'OTHER', pair: 'USD/KRW', base: 'KRW', keywords: ['south korean won', 'krw', 'korea'] },
  { category: 'OTHER', pair: 'USD/TRY', base: 'TRY', keywords: ['turkish lira', 'try', 'turkey'] },
  { category: 'OTHER', pair: 'USD/TWD', base: 'TWD', keywords: ['taiwan dollar', 'twd', 'taiwan'] },
  { category: 'OTHER', pair: 'VIRTUAL/USD', base: 'VIRTUAL', keywords: ['virtual'] },
  { category: 'OTHER', pair: 'WIF/USD', base: 'WIF', keywords: ['wif', 'dogwifhat'] },
  { category: 'OTHER', pair: 'WLD/USD', base: 'WLD', keywords: ['worldcoin', 'wld'] },
  { category: 'OTHER', pair: 'XMR/USD', base: 'XMR', keywords: ['monero', 'xmr'] },
  { category: 'OTHER', pair: 'XPL/USD', base: 'XPL', keywords: ['xpl'] },
  { category: 'OTHER', pair: 'ZEC/USD', base: 'ZEC', keywords: ['zcash', 'zec'] },
  { category: 'OTHER', pair: 'ZK/USD', base: 'ZK', keywords: ['zk', 'zksync'] },
  { category: 'OTHER', pair: 'ZORA/USD', base: 'ZORA', keywords: ['zora'] },
  { category: 'OTHER', pair: 'ZRO/USD', base: 'ZRO', keywords: ['zro', 'layerzero'] },
];

/**
 * Match a keyword against text with proper boundary handling
 * Short keywords (2-3 chars) use word boundaries to avoid false positives
 * Longer keywords use substring matching
 */
function matchKeyword(text: string, keyword: string): boolean {
  const keywordLower = keyword.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (keywordLower.length <= 3) {
    // Use word boundaries for short keywords
    const wordBoundaryRegex = new RegExp(
      `\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 
      'i'
    );
    return wordBoundaryRegex.test(textLower);
  } else {
    // For longer keywords, simple includes is fine
    return textLower.includes(keywordLower);
  }
}

/**
 * Find the single primary asset for a news article with confidence scoring
 * Returns null if no asset matches with sufficient confidence (>= 40 for non-blocking inference)
 * 
 * Scoring:
 * - Headline keyword match: +40 points
 * - Description keyword match: +20 points
 * - Multiple keyword matches accumulate
 * - Proxy assets get 15% penalty
 * - Minimum 40% confidence to return a match (lowered from 70% for non-blocking inference)
 * 
 * @param headline - Article headline
 * @param description - Article description (optional)
 * @param availablePairs - Optional set of available pairs to filter by (for speed optimization)
 */
export function findPrimaryAsset(
  headline: string, 
  description: string | null,
  availablePairs?: Set<string>
): AssetMatch | null {
  const text = `${headline} ${description || ''}`.toLowerCase();
  const headlineOnly = headline.toLowerCase();
  
  const matches: AssetMatch[] = [];
  
  // Pre-filter pairs if availablePairs is provided (optimization for Avantis-only matching)
  // SAFETY: Only use availablePairs filter if it has a reasonable number of pairs (>10)
  // If empty or too small, fall back to all TRADING_PAIRS to avoid filtering out everything
  const pairsToCheck = availablePairs && availablePairs.size > 10
    ? TRADING_PAIRS.filter(p => availablePairs.has(p.pair))
    : TRADING_PAIRS;
  
  // Log if we're using filtered vs all pairs (for debugging)
  if (availablePairs && availablePairs.size <= 10) {
    console.warn(`[findPrimaryAsset] ⚠️ availablePairs has only ${availablePairs.size} pairs, using all TRADING_PAIRS instead`);
  }
  
  for (const pair of pairsToCheck) {
    let score = 0;
    const matched: string[] = [];
    
    for (const keyword of pair.keywords) {
      const keywordLower = keyword.toLowerCase();
      const inHeadline = matchKeyword(headlineOnly, keywordLower);
      const inText = !inHeadline && matchKeyword(text, keywordLower);
      
      if (inHeadline) {
        score += 40; // Headline match = high confidence
        matched.push(keyword);
      } else if (inText) {
        score += 20; // Description match = medium confidence
        matched.push(keyword);
      }
    }
    
    if (score === 0) continue;
    
    // Penalize proxy assets slightly (15% reduction)
    if (pair.isProxy) {
      score = Math.floor(score * 0.85);
    }
    
    // Cap at 100
    const confidence = Math.min(100, score);
    
    // Debug: Log scores that are close but below threshold (for troubleshooting)
    if (confidence >= 30 && confidence < 40 && matches.length === 0) {
      // Only log first few to avoid spam
      const debugCount = (globalThis as any).__debugMatchCount || 0;
      if (debugCount < 3) {
        console.log(`[findPrimaryAsset] Near-miss: "${headline.substring(0, 60)}..." scored ${confidence} for ${pair.pair} (matched: ${matched.join(', ')})`);
        (globalThis as any).__debugMatchCount = debugCount + 1;
      }
    }
    
    // Only include if confidence >= 40 (lowered from 70% for non-blocking inference)
    if (confidence >= 40) {
      matches.push({
        pair: pair.pair,
        confidence,
        matchedKeywords: matched,
        isProxy: pair.isProxy || false,
        category: pair.category,
      });
    }
  }
  
  // Return highest confidence match only (single primary asset)
  if (matches.length === 0) return null;
  
  // Sort by confidence descending, prefer non-proxy assets when tied
  matches.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    // Prefer non-proxy when confidence is equal
    if (a.isProxy !== b.isProxy) return a.isProxy ? 1 : -1;
    return 0;
  });
  
  return matches[0];
}

/**
 * Find relevant trading pairs for a news article (legacy function)
 * Kept for backward compatibility
 */
export function findRelevantPairs(headline: string, description: string | null): TradingPair[] {
  const text = `${headline} ${description || ''}`.toLowerCase();
  const relevant: TradingPair[] = [];
  
  for (const pair of TRADING_PAIRS) {
    for (const keyword of pair.keywords) {
      if (matchKeyword(text, keyword)) {
        relevant.push(pair);
        break; // Only add once per pair
      }
    }
  }
  
  return relevant;
}

/**
 * Check if news is relevant to any trading pair
 * Now uses confidence-based matching with 70% threshold
 */
export function isRelevantToTradingPairs(headline: string, description: string | null): boolean {
  return findPrimaryAsset(headline, description) !== null;
}

/**
 * Get category from trading pair category
 */
export function mapPairCategoryToNewsCategory(pairCategory: TradingPair['category'], pair?: string): string {
  // Special handling: Gold and Silver map to 'metals' category
  if (pair && (pair.includes('XAU') || pair.includes('XAG') || pair.includes('GOLD') || pair.includes('SILVER'))) {
    return 'metals';
  }
  
  const map: Record<TradingPair['category'], string> = {
    'CRYPTO': 'crypto',
    'FOREX': 'finance',
    'COMMODITIES': 'energy', // Oil/energy commodities
    'OTHER': 'tech', // Stocks/tokens fall under tech
  };
  return map[pairCategory] || 'trending';
}
