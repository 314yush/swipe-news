/**
 * Avantis Trading Pairs Configuration
 * Maps trading pairs to keywords for news matching
 */

export interface TradingPair {
  category: 'CRYPTO' | 'FOREX' | 'COMMODITIES' | 'OTHER';
  pair: string;
  base: string; // e.g., BTC from BTC/USD
  keywords: string[]; // Keywords to match in news
}

// Extract base symbols and create keyword mappings
export const TRADING_PAIRS: TradingPair[] = [
  // CRYPTO
  { category: 'CRYPTO', pair: 'APT/USD', base: 'APT', keywords: ['aptos', 'apt'] },
  { category: 'CRYPTO', pair: 'ARB/USD', base: 'ARB', keywords: ['arbitrum', 'arb'] },
  { category: 'CRYPTO', pair: 'AVAX/USD', base: 'AVAX', keywords: ['avalanche', 'avax'] },
  { category: 'CRYPTO', pair: 'BNB/USD', base: 'BNB', keywords: ['binance', 'bnb', 'binance coin'] },
  { category: 'CRYPTO', pair: 'BTC/USD', base: 'BTC', keywords: ['bitcoin', 'btc'] },
  { category: 'CRYPTO', pair: 'DOGE/USD', base: 'DOGE', keywords: ['dogecoin', 'doge'] },
  { category: 'CRYPTO', pair: 'ETH/USD', base: 'ETH', keywords: ['ethereum', 'eth', 'ether'] },
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
  { category: 'FOREX', pair: 'EUR/USD', base: 'EUR', keywords: ['euro', 'eur', 'european union', 'ecb'] },
  { category: 'FOREX', pair: 'GBP/USD', base: 'GBP', keywords: ['british pound', 'gbp', 'sterling', 'uk', 'britain'] },
  { category: 'FOREX', pair: 'NZD/USD', base: 'NZD', keywords: ['new zealand dollar', 'nzd'] },
  { category: 'FOREX', pair: 'USD/CAD', base: 'CAD', keywords: ['canadian dollar', 'cad', 'canada'] },
  { category: 'FOREX', pair: 'USD/CHF', base: 'CHF', keywords: ['swiss franc', 'chf', 'switzerland'] },
  { category: 'FOREX', pair: 'USD/JPY', base: 'JPY', keywords: ['japanese yen', 'jpy', 'japan', 'boj', 'bank of japan'] },
  { category: 'FOREX', pair: 'USD/MXN', base: 'MXN', keywords: ['mexican peso', 'mxn', 'mexico'] },
  { category: 'FOREX', pair: 'USD/SEK', base: 'SEK', keywords: ['swedish krona', 'sek', 'sweden'] },
  { category: 'FOREX', pair: 'USD/SGD', base: 'SGD', keywords: ['singapore dollar', 'sgd', 'singapore'] },
  { category: 'FOREX', pair: 'USD/ZAR', base: 'ZAR', keywords: ['south african rand', 'zar', 'south africa'] },
  
  // COMMODITIES
  { category: 'COMMODITIES', pair: 'USOILSPOT/USD', base: 'OIL', keywords: ['oil', 'crude', 'wti', 'brent', 'petroleum', 'energy prices'] },
  { category: 'COMMODITIES', pair: 'XAG/USD', base: 'SILVER', keywords: ['silver', 'xag'] },
  { category: 'COMMODITIES', pair: 'XAU/USD', base: 'GOLD', keywords: ['gold', 'xau', 'precious metals'] },
  
  // OTHER - Stocks & Tokens
  { category: 'OTHER', pair: 'AAPL/USD', base: 'AAPL', keywords: ['apple', 'aapl'] },
  { category: 'OTHER', pair: 'AAVE/USD', base: 'AAVE', keywords: ['aave'] },
  { category: 'OTHER', pair: 'AERO/USD', base: 'AERO', keywords: ['aero'] },
  { category: 'OTHER', pair: 'AMZN/USD', base: 'AMZN', keywords: ['amazon', 'amzn'] },
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
  { category: 'OTHER', pair: 'GOOG/USD', base: 'GOOG', keywords: ['google', 'alphabet', 'goog'] },
  { category: 'OTHER', pair: 'HOOD/USD', base: 'HOOD', keywords: ['robinhood', 'hood'] },
  { category: 'OTHER', pair: 'JUP/USD', base: 'JUP', keywords: ['jupiter', 'jup'] },
  { category: 'OTHER', pair: 'KAITO/USD', base: 'KAITO', keywords: ['kaito'] },
  { category: 'OTHER', pair: 'LDO/USD', base: 'LDO', keywords: ['lido', 'ldo'] },
  { category: 'OTHER', pair: 'META/USD', base: 'META', keywords: ['meta', 'facebook'] },
  { category: 'OTHER', pair: 'MON/USD', base: 'MON', keywords: ['mon'] },
  { category: 'OTHER', pair: 'MSFT/USD', base: 'MSFT', keywords: ['microsoft', 'msft'] },
  { category: 'OTHER', pair: 'NVDA/USD', base: 'NVDA', keywords: ['nvidia', 'nvda'] },
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
  { category: 'OTHER', pair: 'SPY/USD', base: 'SPY', keywords: ['spy', 's&p 500', 'sp500'] },
  { category: 'OTHER', pair: 'STX/USD', base: 'STX', keywords: ['stacks', 'stx'] },
  { category: 'OTHER', pair: 'TAO/USD', base: 'TAO', keywords: ['tao', 'bittensor'] },
  { category: 'OTHER', pair: 'TRUMP/USD', base: 'TRUMP', keywords: ['trump'] },
  { category: 'OTHER', pair: 'TSLA/USD', base: 'TSLA', keywords: ['tesla', 'tsla'] },
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
 * Find relevant trading pairs for a news article
 */
export function findRelevantPairs(headline: string, description: string | null): TradingPair[] {
  const text = `${headline} ${description || ''}`.toLowerCase();
  const relevant: TradingPair[] = [];
  
  for (const pair of TRADING_PAIRS) {
    for (const keyword of pair.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // For short keywords (2-3 chars), use word boundaries to avoid false positives
      // For longer keywords, use simple includes
      let matches = false;
      
      if (keywordLower.length <= 3) {
        // Use word boundaries for short keywords to avoid matching within other words
        // e.g., "op" should match "optimism" or "op token" but not "operations" or "stop"
        const wordBoundaryRegex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        matches = wordBoundaryRegex.test(text);
      } else {
        // For longer keywords, simple includes is fine
        matches = text.includes(keywordLower);
      }
      
      if (matches) {
        relevant.push(pair);
        break; // Only add once per pair
      }
    }
  }
  
  return relevant;
}

/**
 * Check if news is relevant to any trading pair
 */
export function isRelevantToTradingPairs(headline: string, description: string | null): boolean {
  return findRelevantPairs(headline, description).length > 0;
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

