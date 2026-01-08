/**
 * Load Avantis trading pairs from static CSV file
 * This replaces the API call for better reliability and speed
 * 
 * The CSV is parsed at module load time and cached
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface AvantisPair {
  category: 'CRYPTO' | 'FOREX' | 'COMMODITIES' | 'OTHER';
  pair: string;
}

// Static CSV data - parsed once at module load
const CSV_DATA = `Category,Pair
CRYPTO,APT/USD
CRYPTO,ARB/USD
CRYPTO,AVAX/USD
CRYPTO,BNB/USD
CRYPTO,BTC/USD
CRYPTO,DOGE/USD
CRYPTO,ETH/USD
CRYPTO,ETHFI/USD
CRYPTO,FARTCOIN/USD
CRYPTO,HYPE/USD
CRYPTO,INJ/USD
CRYPTO,LINK/USD
CRYPTO,NEAR/USD
CRYPTO,OP/USD
CRYPTO,POPCAT/USD
CRYPTO,SEI/USD
CRYPTO,SOL/USD
CRYPTO,SUI/USD
CRYPTO,TIA/USD
CRYPTO,XRP/USD
FOREX,AUD/USD
FOREX,EUR/USD
FOREX,GBP/USD
FOREX,NZD/USD
FOREX,USD/CAD
FOREX,USD/CHF
FOREX,USD/JPY
FOREX,USD/MXN
FOREX,USD/SEK
FOREX,USD/SGD
FOREX,USD/ZAR
COMMODITIES,USOILSPOT/USD
COMMODITIES,XAG/USD
COMMODITIES,XAU/USD
OTHER,AAPL/USD
OTHER,AAVE/USD
OTHER,AERO/USD
OTHER,AMZN/USD
OTHER,APE/USD
OTHER,ARKM/USD
OTHER,ASTER/USD
OTHER,AVNT/USD
OTHER,BERA/USD
OTHER,BONK/USD
OTHER,BRETT/USD
OTHER,CHILLGUY/USD
OTHER,COIN/USD
OTHER,DYM/USD
OTHER,EIGEN/USD
OTHER,ENA/USD
OTHER,FET/USD
OTHER,GOAT/USD
OTHER,GOOG/USD
OTHER,HOOD/USD
OTHER,JUP/USD
OTHER,KAITO/USD
OTHER,LDO/USD
OTHER,META/USD
OTHER,MON/USD
OTHER,MSFT/USD
OTHER,NVDA/USD
OTHER,ONDO/USD
OTHER,ORDI/USD
OTHER,PENDLE/USD
OTHER,PENGU/USD
OTHER,PEPE/USD
OTHER,POL/USD
OTHER,PUMP/USD
OTHER,QQQ/USD
OTHER,RENDER/USD
OTHER,REZ/USD
OTHER,SHIB/USD
OTHER,SPY/USD
OTHER,STX/USD
OTHER,TAO/USD
OTHER,TRUMP/USD
OTHER,TSLA/USD
OTHER,USD/BRL
OTHER,USD/CNH
OTHER,USD/IDR
OTHER,USD/INR
OTHER,USD/KRW
OTHER,USD/TRY
OTHER,USD/TWD
OTHER,VIRTUAL/USD
OTHER,WIF/USD
OTHER,WLD/USD
OTHER,XMR/USD
OTHER,XPL/USD
OTHER,ZEC/USD
OTHER,ZK/USD
OTHER,ZORA/USD
OTHER,ZRO/USD`;

let cachedPairs: Set<string> | null = null;

/**
 * Parse CSV content into pairs Set
 */
function parseCSV(csvContent: string): Set<string> {
  const pairs = new Set<string>();
  const lines = csvContent.split('\n');
  
  // Skip header line (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const [category, pair] = line.split(',');
    if (pair && pair !== 'Pair') { // Skip header if present
      const cleanPair = pair.trim();
      // Skip delisted pairs
      if (!cleanPair.includes('DELISTED')) {
        pairs.add(cleanPair);
      }
    }
  }
  
  return pairs;
}

/**
 * Load Avantis pairs from CSV file or embedded data
 * Returns a Set of pair strings (e.g., "BTC/USD")
 * Skips DELISTED pairs
 */
export function loadAvantisPairsFromCSV(): Set<string> {
  // Return cached if available
  if (cachedPairs) {
    return cachedPairs;
  }

  try {
    // Try to read from file first (works in Next.js API routes)
    let csvContent: string;
    try {
      const { readFileSync } = require('fs');
      const { join } = require('path');
      const csvPath = join(process.cwd(), 'Avantis_Trading_Pairs.csv');
      csvContent = readFileSync(csvPath, 'utf-8');
      console.log(`[Avantis Pairs] 📁 Loaded from file: ${csvPath}`);
    } catch (fileError) {
      // Fallback to embedded CSV data
      csvContent = CSV_DATA;
      console.log(`[Avantis Pairs] 📦 Using embedded CSV data (file not found)`);
    }
    
    const pairs = parseCSV(csvContent);
    cachedPairs = pairs;
    console.log(`[Avantis Pairs] ✅ Loaded ${pairs.size} pairs`);
    return pairs;
  } catch (error) {
    console.error('[Avantis Pairs] ❌ Error parsing CSV:', error);
    // Fallback to empty set - will trigger fallback in getAvailableAvantisPairs
    return new Set<string>();
  }
}

