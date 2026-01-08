/**
 * Article Normalization Module
 * Converts APITube format to internal article schema
 * Assigns freshness buckets and generates deduplication hashes
 */

import { type APITubeArticle } from './apitube';
import { findPrimaryAsset } from '@/lib/config/tradingPairs';
import { createHash } from 'crypto';

export type FreshnessBucket = 'hot' | 'recent' | 'older';

export interface NormalizedArticle {
  id: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  published_at: string; // ISO 8601 datetime
  fetched_at: string; // ISO 8601 datetime
  inferred_asset: string | null;
  inferred_market: string | null;
  age_minutes: number;
  freshness_bucket: FreshnessBucket;
  hash: string;
  image_url: string | null;
  // Additional fields for compatibility
  headline: string; // Alias for title
  brief: string | null; // Alias for description
  category?: string;
}

/**
 * Clean HTML and normalize text
 */
function cleanText(text: string): string {
  if (!text) return '';
  
  let cleaned = text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1') // Remove CDATA
    .replace(/<[^>]+>/g, ''); // Remove HTML tags
  
  // Decode numeric HTML entities (hexadecimal: &#x2018;)
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });
  
  // Decode numeric HTML entities (decimal: &#8217;)
  cleaned = cleaned.replace(/&#(\d+);/g, (match, dec) => {
    const code = parseInt(dec, 10);
    return String.fromCharCode(code);
  });
  
  // Decode named HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned;
}

/**
 * Normalize title for hash generation
 * Lowercase, trim, remove extra whitespace
 */
function normalizeTitleForHash(title: string): string {
  return cleanText(title)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate deduplication hash
 * Formula: sha1(normalized_title + source + floor(published_at / 5 minutes))
 */
function generateHash(article: APITubeArticle): string {
  const normalizedTitle = normalizeTitleForHash(article.title);
  const source = article.source?.domain || 'unknown';
  const publishedAt = new Date(article.published_at);
  
  // Floor to 5-minute buckets
  const fiveMinuteBucket = Math.floor(publishedAt.getTime() / (5 * 60 * 1000));
  
  const hashInput = `${normalizedTitle}|${source}|${fiveMinuteBucket}`;
  return createHash('sha1').update(hashInput).digest('hex');
}

/**
 * Calculate age in minutes from published_at
 */
function calculateAgeMinutes(publishedAt: string): number {
  const published = new Date(publishedAt);
  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Assign freshness bucket based on age
 * - hot: age_minutes <= 15
 * - recent: 15 < age_minutes <= 120
 * - older: age_minutes > 120
 */
function assignFreshnessBucket(ageMinutes: number): FreshnessBucket {
  if (ageMinutes <= 15) {
    return 'hot';
  } else if (ageMinutes <= 120) {
    return 'recent';
  } else {
    return 'older';
  }
}

/**
 * Infer asset and market from article content (non-blocking)
 * Uses 0.4 confidence threshold (40% - already updated in findPrimaryAsset)
 * Returns null if no match, but doesn't exclude article
 */
function inferAssetNonBlocking(
  title: string,
  description: string | null
): { asset: string | null; market: string | null; confidence: number } {
  try {
    // findPrimaryAsset now uses 40% threshold, so if it returns a match, use it
    const match = findPrimaryAsset(title, description);
    
    if (match) {
      return {
        asset: match.pair,
        market: match.pair, // Use pair as market for now
        confidence: match.confidence,
      };
    }
    
    return { asset: null, market: null, confidence: 0 };
  } catch (error) {
    console.warn('[Article Normalizer] Error inferring asset:', error);
    return { asset: null, market: null, confidence: 0 };
  }
}

/**
 * Generate unique article ID
 * Uses hash of title + source + published_at
 */
function generateArticleId(article: APITubeArticle): string {
  const normalizedTitle = normalizeTitleForHash(article.title);
  const source = article.source?.domain || 'unknown';
  const publishedAt = article.published_at;
  
  const idInput = `${normalizedTitle}|${source}|${publishedAt}`;
  return createHash('sha1').update(idInput).digest('hex').substring(0, 16);
}

/**
 * Normalize APITube article to internal schema
 */
export function normalizeArticle(article: APITubeArticle): NormalizedArticle {
  const now = new Date();
  const fetchedAt = now.toISOString();
  
  // Clean and normalize text
  const title = cleanText(article.title);
  const description = article.description 
    ? cleanText(article.description)
    : (article.body ? cleanText(article.body.substring(0, 500)) : null);
  
  // Calculate age and assign freshness bucket
  const ageMinutes = calculateAgeMinutes(article.published_at);
  const freshnessBucket = assignFreshnessBucket(ageMinutes);
  
  // Generate hash for deduplication
  const hash = generateHash(article);
  
  // Generate article ID
  const id = generateArticleId(article);
  
  // Non-blocking asset inference
  const { asset: inferredAsset, market: inferredMarket } = inferAssetNonBlocking(
    title,
    description
  );
  
  // Infer category from asset if available
  let category: string | undefined;
  if (inferredAsset) {
    // Map asset to category (simplified - can be enhanced)
    if (inferredAsset.includes('/USD')) {
      const base = inferredAsset.split('/')[0];
      if (['BTC', 'ETH', 'SOL', 'XRP'].includes(base)) {
        category = 'crypto';
      } else if (['EUR', 'GBP', 'JPY', 'AUD'].includes(base)) {
        category = 'finance';
      } else if (['XAU', 'XAG', 'USOILSPOT'].includes(base)) {
        category = 'energy';
      } else {
        category = 'tech';
      }
    }
  }
  
  return {
    id,
    title,
    headline: title, // Alias
    description,
    brief: description, // Alias
    url: article.href,
    source: article.source?.domain || 'Unknown',
    published_at: article.published_at,
    fetched_at: fetchedAt,
    inferred_asset: inferredAsset,
    inferred_market: inferredMarket,
    age_minutes: ageMinutes,
    freshness_bucket: freshnessBucket,
    hash,
    image_url: article.image || null,
    category,
  };
}

/**
 * Normalize multiple articles
 */
export function normalizeArticles(articles: APITubeArticle[]): NormalizedArticle[] {
  return articles.map(normalizeArticle);
}

