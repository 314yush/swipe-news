/**
 * RSS News Service - Client-side
 * Fetches RSS news from Next.js API route (no Supabase required)
 */

export interface RSSNewsItem {
  id: string;
  headline: string;
  brief: string | null;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  urgency: 1 | 2 | 3;
  tags: string[];
  relevantPairs: string[]; // Trading pairs this news is relevant to
  imageUrl: string | null; // Cover image URL
}

export interface RSSNewsResponse {
  success: boolean;
  items: RSSNewsItem[];
  count: number;
  timestamp: string;
  cacheExpiresAt?: string; // When the global cache expires (for timer)
  cached?: boolean; // Whether response was from cache
  error?: string;
}

/**
 * Fetch RSS news from Next.js API route
 * @returns Object with items and cache expiration info
 */
export async function fetchRSSNews({
  category,
  limit = 50,
  maxAgeMinutes,
}: {
  category?: string;
  limit?: number;
  maxAgeMinutes?: number; // Time window in minutes (e.g., 15 for 15 minutes, 1440 for 24 hours)
} = {}): Promise<{ items: RSSNewsItem[]; cacheExpiresAt?: string }> {
  try {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', limit.toString());
    if (maxAgeMinutes) params.set('maxAgeMinutes', maxAgeMinutes.toString());
    
    const response = await fetch(`/api/rss-news?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: RSSNewsResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch RSS news');
    }
    
    return {
      items: data.items,
      cacheExpiresAt: data.cacheExpiresAt,
    };
  } catch (error) {
    console.error('Error fetching RSS news:', error);
    return { items: [] };
  }
}

/**
 * Convert RSS news item to NewsItem format for compatibility
 */
export function convertRSSToNewsItem(rssItem: RSSNewsItem) {
  return {
    id: rssItem.id,
    headline: rssItem.headline,
    brief: rssItem.brief || '',
    source: rssItem.source,
    publishedAt: rssItem.publishedAt,
    url: rssItem.url,
    category: rssItem.category.charAt(0).toUpperCase() + rssItem.category.slice(1), // Capitalize
    imageUrl: rssItem.imageUrl || null, // Use image from RSS feed
    relevantPairs: rssItem.relevantPairs || [], // Trading pairs this news is relevant to
  };
}

/**
 * Fetch and update news store
 * @returns Object with news items and cache expiration time
 */
export async function fetchAndUpdateNews(category?: string, maxAgeMinutes?: number): Promise<{ items: ReturnType<typeof convertRSSToNewsItem>[]; cacheExpiresAt?: string }> {
  // Request significantly more items for swipe feed (15min) to ensure 30-40+ headlines
  // For 15-minute window, we need to cast a wide net since RSS feeds may not publish that frequently
  const limit = maxAgeMinutes && maxAgeMinutes <= 15 ? 200 : 50;
  const { items, cacheExpiresAt } = await fetchRSSNews({ category, limit, maxAgeMinutes });
  return {
    items: items.map(convertRSSToNewsItem),
    cacheExpiresAt,
  };
}

