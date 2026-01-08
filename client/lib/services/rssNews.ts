/**
 * RSS News Service - Client-side
 * Fetches RSS news from Next.js API route (no Supabase required)
 * 
 * Schema includes tiering system:
 * - Tier A: Breaking news (urgency 3, confidence >= 80, non-proxy)
 * - Tier B: Actionable news (confidence >= 70)
 */

export type Tier = 'A' | 'B';

export interface RSSNewsItem {
  id: string;
  headline: string;
  brief: string | null;
  source: string;
  url: string;
  publishedAt: string;      // RSS timestamp (unreliable - may be delayed/batched)
  firstSeenAt: string;      // When OUR system first observed this item (the clock we control)
  fetchedAt: string;        // When item was fetched (legacy)
  category: string;
  urgency: 1 | 2 | 3;
  tags: string[];
  relevantPairs: string[];  // Trading pairs this news is relevant to (legacy)
  imageUrl: string | null;  // Cover image URL
  primaryAsset: string;     // Single asset (e.g., "BTC/USD") - only Avantis-tradable
  assetConfidence: number;  // 0-100
  isProxyAsset: boolean;    // Whether primaryAsset is a proxy
  tier: Tier;               // A or B
  expiresAt: string;        // firstSeenAt + 30 minutes
}

export interface RSSNewsResponse {
  success: boolean;
  items: RSSNewsItem[];
  count: number;
  tierACount?: number;      // Count of Tier A items
  tierBCount?: number;      // Count of Tier B items
  timestamp: string;
  cacheExpiresAt?: string;  // When the global cache expires (for timer)
  cached?: boolean;         // Whether response was from cache
  error?: string;
}

/**
 * Fetch RSS news from Next.js API route
 * Now uses new APITube ingestion pipeline endpoints
 * @returns Object with items and cache expiration info
 */
export async function fetchRSSNews({
  category,
  limit = 25,
  maxAgeMinutes,
}: {
  category?: string;
  limit?: number;
  maxAgeMinutes?: number; // Time window in minutes (e.g., 15 for 15 minutes, 1440 for 24 hours)
} = {}): Promise<{ items: RSSNewsItem[]; cacheExpiresAt?: string; tierACount?: number; tierBCount?: number; nowShowingOlderNews?: boolean }> {
  try {
    // Determine which endpoint to use based on maxAgeMinutes
    // Swipe feed: 15 minutes or less -> /api/swipe-feed
    // Main feed: 24 hours -> /api/main-feed
    const isSwipeFeed = maxAgeMinutes !== undefined && maxAgeMinutes <= 15;
    const endpoint = isSwipeFeed ? '/api/swipe-feed' : '/api/main-feed';
    
    const params = new URLSearchParams();
    if (category && category !== 'Trending') params.set('category', category);
    if (limit) params.set('limit', limit.toString());
    
    // For swipe feed, include swiped article IDs from localStorage if available
    if (isSwipeFeed && typeof window !== 'undefined') {
      try {
        const newsStore = localStorage.getItem('news-store');
        if (newsStore) {
          const parsed = JSON.parse(newsStore);
          const interactedNews = parsed?.state?.interactedNews || {};
          const swipedIds = Object.keys(interactedNews);
          if (swipedIds.length > 0) {
            params.set('swiped', JSON.stringify(swipedIds));
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    // For main feed, include interactions
    if (!isSwipeFeed && typeof window !== 'undefined') {
      try {
        const newsStore = localStorage.getItem('news-store');
        if (newsStore) {
          const parsed = JSON.parse(newsStore);
          const interactedNews = parsed?.state?.interactedNews || {};
          if (Object.keys(interactedNews).length > 0) {
            params.set('interactions', JSON.stringify(interactedNews));
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    const url = `${endpoint}?${params.toString()}`;
    console.log('[RSS Service] 🔄 Fetching from:', url);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const startTime = Date.now();
    console.log('[RSS Service] 📡 Making fetch request...');
    
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store', // Force fresh request, don't use browser cache
    });
    
    const fetchTime = Date.now() - startTime;
    console.log(`[RSS Service] ✅ Fetch completed in ${fetchTime}ms, status: ${response.status}`);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[RSS Service] HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('[RSS Service] API response:', {
      success: data.success,
      itemsCount: data.items?.length || 0,
      nowShowingOlderNews: data.nowShowingOlderNews,
      error: data.error,
    });
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch news');
    }
    
    // Convert to RSSNewsItem format for backward compatibility
    const items: RSSNewsItem[] = (data.items || []).map((item: any) => ({
      id: item.id,
      headline: item.headline,
      brief: item.brief,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      firstSeenAt: item.firstSeenAt || item.publishedAt,
      fetchedAt: item.firstSeenAt || item.publishedAt,
      category: item.category || 'Trending',
      urgency: item.freshnessBucket === 'hot' ? 3 : item.freshnessBucket === 'recent' ? 2 : 1 as 1 | 2 | 3,
      tags: [],
      relevantPairs: item.primaryAsset ? [item.primaryAsset] : [],
      imageUrl: item.imageUrl,
      primaryAsset: item.primaryAsset || '',
      assetConfidence: item.assetConfidence || 0,
      isProxyAsset: item.isProxyAsset || false,
      tier: item.tier || (item.freshnessBucket === 'hot' ? 'A' : 'B'),
      expiresAt: item.expiresAt,
    }));
    
    // Calculate tier counts
    const tierACount = items.filter(i => i.tier === 'A').length;
    const tierBCount = items.filter(i => i.tier === 'B').length;
    
    return {
      items,
      cacheExpiresAt: data.timestamp, // Use timestamp as cache expiration
      tierACount,
      tierBCount,
      nowShowingOlderNews: data.nowShowingOlderNews,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[RSS Service] Request timed out after 30 seconds');
    } else {
      console.error('[RSS Service] Error fetching news:', error);
    }
    return { items: [] };
  }
}

/**
 * Convert RSS news item to NewsItem format for compatibility
 * Includes new fields: primaryAsset, assetConfidence, tier
 */
export function convertRSSToNewsItem(rssItem: RSSNewsItem) {
  return {
    id: rssItem.id,
    headline: rssItem.headline,
    brief: rssItem.brief || '',
    source: rssItem.source,
    publishedAt: rssItem.publishedAt,
    firstSeenAt: rssItem.firstSeenAt, // When we first saw it (for freshness checks)
    url: rssItem.url,
    category: rssItem.category.charAt(0).toUpperCase() + rssItem.category.slice(1), // Capitalize
    imageUrl: rssItem.imageUrl || null,
    relevantPairs: rssItem.relevantPairs || [],
    // New fields
    primaryAsset: rssItem.primaryAsset, // Only Avantis-tradable assets
    assetConfidence: rssItem.assetConfidence,
    isProxyAsset: rssItem.isProxyAsset,
    tier: rssItem.tier,
    expiresAt: rssItem.expiresAt,
  };
}

/**
 * Fetch and update news store
 * @returns Object with news items and cache expiration time
 */
export async function fetchAndUpdateNews(category?: string, maxAgeMinutes?: number): Promise<{ 
  items: ReturnType<typeof convertRSSToNewsItem>[]; 
  cacheExpiresAt?: string;
  tierACount?: number;
  tierBCount?: number;
  nowShowingOlderNews?: boolean;
}> {
  // Swipe feed (15min): request 25 items (tier-based sorting)
  // Feed page (24h): request 100 items (chronological sorting)
  const limit = maxAgeMinutes && maxAgeMinutes >= 24 * 60 ? 100 : 25;
  const { items, cacheExpiresAt, tierACount, tierBCount, nowShowingOlderNews } = await fetchRSSNews({ category, limit, maxAgeMinutes });
  return {
    items: items.map(convertRSSToNewsItem),
    cacheExpiresAt,
    tierACount,
    tierBCount,
    nowShowingOlderNews,
  };
}
