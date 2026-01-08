/**
 * Market Mapper - Detects market pair from news text
 * Uses keyword matching with weighted scoring
 */

import marketKeywords from '../config/marketKeywords.json';
import { DEFAULT_MARKET, isMarketSupported } from '../config/avantisMarkets';

/**
 * Tokenize text into lowercase words
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of lowercase tokens
 */
function tokenize(text) {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((token) => token.length > 1); // Remove single characters
}

/**
 * Calculate match score for a market based on keywords
 * @param {string[]} tokens - Tokenized text
 * @param {Object} marketConfig - Market keyword configuration
 * @returns {number} Match score
 */
function calculateScore(tokens, marketConfig) {
  const { keywords, priority } = marketConfig;
  let score = 0;
  const matchedKeywords = new Set();

  // Join tokens back to text for multi-word matching
  const text = tokens.join(' ');

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Check for exact word match
    if (tokens.includes(keywordLower)) {
      score += priority;
      matchedKeywords.add(keyword);
    }
    // Check for multi-word phrase match
    else if (keywordLower.includes(' ') && text.includes(keywordLower)) {
      score += priority * 1.5; // Bonus for multi-word matches
      matchedKeywords.add(keyword);
    }
    // Check for partial matches (for compound words)
    else {
      for (const token of tokens) {
        if (token.includes(keywordLower) || keywordLower.includes(token)) {
          if (token.length >= 3 && keywordLower.length >= 3) {
            score += priority * 0.5;
            matchedKeywords.add(keyword);
            break;
          }
        }
      }
    }
  }

  return {
    score,
    matchedKeywords: Array.from(matchedKeywords),
  };
}

/**
 * Detect the most relevant market pair from news text
 * @param {string} headline - News headline
 * @param {string} brief - News brief/description (optional)
 * @returns {Object} Detection result { market, confidence, matchedKeywords }
 */
export function detectMarket(headline, brief = '') {
  // Combine headline and brief, giving headline more weight
  const headlineTokens = tokenize(headline);
  const briefTokens = tokenize(brief);
  
  // Headline tokens count double
  const allTokens = [...headlineTokens, ...headlineTokens, ...briefTokens];
  
  if (allTokens.length === 0) {
    return {
      market: DEFAULT_MARKET,
      confidence: 0,
      matchedKeywords: [],
    };
  }

  let bestMatch = {
    market: DEFAULT_MARKET,
    score: 0,
    matchedKeywords: [],
  };

  // Score each market
  for (const [market, config] of Object.entries(marketKeywords)) {
    if (!isMarketSupported(market)) continue;
    
    const { score, matchedKeywords } = calculateScore(allTokens, config);
    
    if (score > bestMatch.score) {
      bestMatch = {
        market,
        score,
        matchedKeywords,
      };
    }
  }

  // Calculate confidence (0-100)
  // Max possible score would be around 15-20 for a very strong match
  const confidence = Math.min(100, Math.round((bestMatch.score / 10) * 100));

  return {
    market: bestMatch.market,
    confidence,
    matchedKeywords: bestMatch.matchedKeywords,
  };
}

/**
 * Detect market with caching for performance
 */
const marketCache = new Map();
const MAX_CACHE_SIZE = 100;

export function detectMarketCached(headline, brief = '') {
  const cacheKey = `${headline}|${brief}`;
  
  if (marketCache.has(cacheKey)) {
    return marketCache.get(cacheKey);
  }

  const result = detectMarket(headline, brief);
  
  // Maintain cache size
  if (marketCache.size >= MAX_CACHE_SIZE) {
    const firstKey = marketCache.keys().next().value;
    marketCache.delete(firstKey);
  }
  
  marketCache.set(cacheKey, result);
  
  return result;
}

/**
 * Get all possible markets from text (for debugging)
 * @param {string} headline - News headline
 * @param {string} brief - News brief
 * @returns {Array} All matches with scores
 */
export function getAllMatches(headline, brief = '') {
  const headlineTokens = tokenize(headline);
  const briefTokens = tokenize(brief);
  const allTokens = [...headlineTokens, ...headlineTokens, ...briefTokens];

  const matches = [];

  for (const [market, config] of Object.entries(marketKeywords)) {
    const { score, matchedKeywords } = calculateScore(allTokens, config);
    if (score > 0) {
      matches.push({
        market,
        score,
        matchedKeywords,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export default detectMarket;







