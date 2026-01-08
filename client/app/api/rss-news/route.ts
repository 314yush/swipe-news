/**
 * Simplified News API Route
 * 
 * 1. Fetch news every 4 minutes
 * 2. Filter by Avantis-available tokens only
 * 3. Split by time:
 *    - <15 mins ago → 'swipe' feed
 *    - Rest → 'feed' page
 */

import { NextRequest, NextResponse } from 'next/server';
import { findPrimaryAsset, mapPairCategoryToNewsCategory, type AssetMatch } from '@/lib/config/tradingPairs';
import { fetchAPITubeNews, convertAPITubeToRSSItem } from '@/lib/services/apitube';
import { fetchNewsFromCategories } from '@/lib/services/apitubeCategory';
import { loadAvantisPairsFromCSV } from '@/lib/config/loadAvantisPairs';

// Single cache: fetch every 4 minutes
let newsCache: { items: NormalizedNewsItem[]; timestamp: number } | null = null;
const CACHE_TTL = 4 * 60 * 1000; // 4 minutes

// Track when we first saw each item
const firstSeenTracker = new Map<string, number>();

interface RSSItem {
  title?: string | null;
  description?: string | null;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  guid?: string;
  imageUrl?: string | null;
}

interface NormalizedNewsItem {
  id: string;
  headline: string;
  brief: string | null;
  source: string;
  url: string;
  publishedAt: string;
  firstSeenAt: string;
  category: string;
  imageUrl: string | null;
  primaryAsset: string;
  assetConfidence: number;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getAvailableAvantisPairs(): Set<string> {
  try {
    return loadAvantisPairsFromCSV();
  } catch (error) {
    console.warn('[API] Error loading pairs from CSV, using fallback');
    const { TRADING_PAIRS } = require('@/lib/config/tradingPairs');
    return new Set(TRADING_PAIRS.map((p: any) => p.pair));
  }
}

/**
 * Fetch and filter news from APITube
 * Only includes news for Avantis-available tokens
 */
async function fetchAndFilterNews(): Promise<NormalizedNewsItem[]> {
  const availablePairs = getAvailableAvantisPairs();
  console.log(`[News API] Fetching news (${availablePairs.size} Avantis pairs available)`);
  
  if (availablePairs.size === 0) {
    console.error(`[News API] ❌ CRITICAL: No Avantis pairs loaded! This will filter out ALL articles.`);
  }

  // Fetch from APITube using category endpoint for better targeting
  // This gets articles from relevant categories (Business/Finance, etc.)
  // which are more likely to match Avantis tokens
  let articles: any[];
  try {
    articles = await fetchNewsFromCategories();
    console.log(`[News API] ✅ Fetched ${articles.length} articles from APITube categories`);
  } catch (error) {
    // Fallback to /everything endpoint if category endpoint fails
    console.warn(`[News API] Category endpoint failed, falling back to /everything:`, error);
    articles = await fetchAPITubeNews({
      maxAgeMinutes: 24 * 60,
      language: 'en',
      perPage: 100,
    });
    console.log(`[News API] Fetched ${articles.length} articles from /everything endpoint`);
  }

  const items: NormalizedNewsItem[] = [];
  const now = Date.now();
  let skippedNoTitle = 0;
  let skippedNoLink = 0;
  let skippedNoMatch = 0;
  const sampleNoMatches: Array<{ title: string; description?: string }> = [];
  const sampleMatches: Array<{ title: string; pair: string; confidence: number }> = [];

  for (const article of articles) {
    const rssItem = convertAPITubeToRSSItem(article);
    
    if (!rssItem.title) {
      skippedNoTitle++;
      continue;
    }
    
    if (!rssItem.link) {
      skippedNoLink++;
      continue;
    }
    
    const title = cleanText(rssItem.title);
    const description = rssItem.description ? cleanText(rssItem.description) : null;
    
    // Filter: Only Avantis-available tokens
    const assetMatch = findPrimaryAsset(title, description, availablePairs);
    if (!assetMatch) {
      skippedNoMatch++;
      // Log first 5 non-matching articles for debugging
      if (sampleNoMatches.length < 5) {
        sampleNoMatches.push({
          title: title.substring(0, 100),
          description: description ? description.substring(0, 100) : undefined,
        });
      }
      continue;
    }
    
    // Log first 5 successful matches
    if (sampleMatches.length < 5) {
      sampleMatches.push({
        title: title.substring(0, 80),
        pair: assetMatch.pair,
        confidence: assetMatch.confidence,
      });
    }
    
    // Track first seen time
    const itemId = hashString(`${article.source?.domain || 'unknown'}|${title}`);
    if (!firstSeenTracker.has(itemId)) {
      firstSeenTracker.set(itemId, now);
    }
    const firstSeenAt = firstSeenTracker.get(itemId)!;
    
    const category = mapPairCategoryToNewsCategory(assetMatch.category, assetMatch.pair);
    
    items.push({
      id: itemId,
      headline: title,
      brief: description,
      source: article.source?.domain || 'Unknown',
      url: rssItem.link,
      publishedAt: rssItem.isoDate,
      firstSeenAt: new Date(firstSeenAt).toISOString(),
      category,
      imageUrl: rssItem.imageUrl,
      primaryAsset: assetMatch.pair,
      assetConfidence: assetMatch.confidence,
    });
  }

  console.log(`[News API] 📊 Filtering results:`);
  console.log(`  - Total articles fetched: ${articles.length}`);
  console.log(`  - Skipped (no title): ${skippedNoTitle}`);
  console.log(`  - Skipped (no link): ${skippedNoLink}`);
  console.log(`  - Skipped (no Avantis token match): ${skippedNoMatch}`);
  console.log(`  - ✅ Matched Avantis tokens: ${items.length}`);
  
  if (sampleMatches.length > 0) {
    console.log(`[News API] ✅ Sample matches:`);
    sampleMatches.forEach((m, i) => {
      console.log(`  ${i + 1}. "${m.title}..." → ${m.pair} (${m.confidence}% confidence)`);
    });
  }
  
  if (items.length === 0 && articles.length > 0) {
    console.error(`[News API] ❌ WARNING: All articles filtered out!`);
    console.error(`  - Available Avantis pairs: ${availablePairs.size}`);
    if (availablePairs.size > 0) {
      console.error(`  - Sample pairs: ${Array.from(availablePairs).slice(0, 10).join(', ')}`);
    }
    console.error(`  - Sample non-matching titles:`);
    sampleNoMatches.forEach((item, i) => {
      console.error(`    ${i + 1}. "${item.title}..."`);
      if (item.description) {
        console.error(`       Description: "${item.description}..."`);
      }
    });
    console.error(`  - Possible causes:`);
    console.error(`    1. Articles don't contain keywords matching TRADING_PAIRS`);
    console.error(`    2. Confidence threshold (70%) is too high`);
    console.error(`    3. Keywords in tradingPairs.ts don't match article content`);
    console.error(`    4. Try checking what keywords are in TRADING_PAIRS for common tokens like BTC, ETH, etc.`);
  }

  return items;
}

/**
 * Get cached news or fetch fresh
 */
async function getNews(): Promise<NormalizedNewsItem[]> {
  const now = Date.now();
  
  // Check cache
  if (newsCache && (now - newsCache.timestamp) < CACHE_TTL) {
    console.log(`[News API] ✅ Using cache (age: ${Math.floor((now - newsCache.timestamp) / 1000)}s)`);
    return newsCache.items;
  }
  
  // Fetch fresh
  console.log(`[News API] 🔄 Fetching fresh news (cache expired or missing)`);
  const items = await fetchAndFilterNews();
  newsCache = { items, timestamp: now };
  return items;
}

/**
 * Split news by time: <15min = swipe, rest = feed
 */
function splitByTime(items: NormalizedNewsItem[]): {
  swipe: NormalizedNewsItem[];
  feed: NormalizedNewsItem[];
} {
  const now = Date.now();
  const swipe: NormalizedNewsItem[] = [];
  const feed: NormalizedNewsItem[] = [];
  
  for (const item of items) {
    const firstSeenAt = new Date(item.firstSeenAt).getTime();
    const ageMinutes = (now - firstSeenAt) / (1000 * 60);
    
    if (ageMinutes < 15) {
      swipe.push(item);
    } else {
      feed.push(item);
    }
  }
  
  // Sort swipe by newest first, feed by newest first
  swipe.sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
  feed.sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
  
  return { swipe, feed };
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.APITUBE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'APITUBE_API_KEY not set' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const feedType = searchParams.get('feed') || 'swipe'; // 'swipe' or 'feed'
    const limit = parseInt(searchParams.get('limit') || '25');
    const category = searchParams.get('category');

    // Get all news (cached or fresh)
    const allItems = await getNews();
    
    // Split by time
    const { swipe, feed } = splitByTime(allItems);
    
    // Select the right feed
    let items = feedType === 'swipe' ? swipe : feed;
    
    // Filter by category if specified
    if (category && category !== 'Trending') {
      const categoryMap: Record<string, string> = {
        'Crypto': 'crypto',
        'Tech': 'tech',
        'Finance': 'finance',
        'Energy': 'energy',
        'Metals': 'metals',
        'Politics': 'politics',
        'Business': 'business',
      };
      const rssCategory = categoryMap[category] || category.toLowerCase();
      items = items.filter(item => item.category === rssCategory);
    }
    
    // Apply limit
    const limitedItems = items.slice(0, limit);
    
    console.log(`[News API] 📊 Returning ${limitedItems.length} items for ${feedType} feed (${swipe.length} swipe, ${feed.length} feed total)`);
    
    return NextResponse.json({
      success: true,
      items: limitedItems,
      count: limitedItems.length,
      feedType,
      swipeCount: swipe.length,
      feedCount: feed.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[News API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
