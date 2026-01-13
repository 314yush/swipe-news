/**
 * Swipe Feed API Route
 * Returns articles for swipe feed with hot→recent→older selection order
 * Never returns empty feed - falls back to older articles if needed
 * Uses global news snapshot from /api/news
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshNewsIfNeeded } from '@/lib/services/newsRefresh';
import { type NormalizedArticle } from '@/lib/services/articleNormalizer';

/**
 * Get user's swiped article IDs
 * For now, we'll accept them as query parameter or header
 * In production, this should come from database or session
 */
function getSwipedArticleIds(request: NextRequest): Set<string> {
  const swipedParam = request.nextUrl.searchParams.get('swiped');
  if (swipedParam) {
    try {
      const swiped = JSON.parse(swipedParam) as string[];
      return new Set(swiped);
    } catch {
      return new Set();
    }
  }
  
  // Could also check headers or session
  return new Set();
}

/**
 * Select articles for swipe feed
 * Priority: hot (unswiped) → recent (unswiped) → older (unswiped)
 * Falls back to swiped articles if no unswiped articles available
 */
function selectSwipeFeedArticles(
  articles: NormalizedArticle[],
  swipedIds: Set<string>,
  limit: number = 25
): {
  articles: NormalizedArticle[];
  nowShowingOlderNews: boolean;
  bucketBreakdown: { hot: number; recent: number; older: number };
} {
  // Filter out swiped articles
  const unswiped = articles.filter(a => !swipedIds.has(a.id));
  const swiped = articles.filter(a => swipedIds.has(a.id));

  // Separate by buckets
  const hotUnswiped = unswiped.filter(a => a.freshness_bucket === 'hot');
  const recentUnswiped = unswiped.filter(a => a.freshness_bucket === 'recent');
  const olderUnswiped = unswiped.filter(a => a.freshness_bucket === 'older');

  // Sort each bucket by published_at DESC
  const sortByPublished = (a: NormalizedArticle, b: NormalizedArticle) => {
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  };

  hotUnswiped.sort(sortByPublished);
  recentUnswiped.sort(sortByPublished);
  olderUnswiped.sort(sortByPublished);

  // Build selection in priority order
  const selected: NormalizedArticle[] = [];
  let nowShowingOlderNews = false;

  // 1. Add hot articles
  selected.push(...hotUnswiped.slice(0, limit - selected.length));

  // 2. Add recent articles if we have space
  if (selected.length < limit) {
    selected.push(...recentUnswiped.slice(0, limit - selected.length));
  }

  // 3. Add older articles if we have space
  if (selected.length < limit) {
    const olderToAdd = olderUnswiped.slice(0, limit - selected.length);
    selected.push(...olderToAdd);
    if (olderToAdd.length > 0) {
      nowShowingOlderNews = true;
    }
  }

  // 4. Fallback: If still not enough, add swiped articles (sorted by published_at DESC)
  if (selected.length < limit) {
    const swipedSorted = [...swiped].sort(sortByPublished);
    selected.push(...swipedSorted.slice(0, limit - selected.length));
  }

  const bucketBreakdown = {
    hot: selected.filter(a => a.freshness_bucket === 'hot').length,
    recent: selected.filter(a => a.freshness_bucket === 'recent').length,
    older: selected.filter(a => a.freshness_bucket === 'older').length,
  };

  return {
    articles: selected,
    nowShowingOlderNews,
    bucketBreakdown,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Refresh snapshot if bucket changed
    const { bucket, articles: allArticles } = await refreshNewsIfNeeded();

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '25', 10);
    const swipedIds = getSwipedArticleIds(request);

    if (allArticles.length === 0) {
      console.warn('[Swipe Feed] No articles in snapshot');
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        nowShowingOlderNews: false,
        bucketBreakdown: { hot: 0, recent: 0, older: 0 },
        bucket,
        timestamp: new Date().toISOString(),
      });
    }

    // Select articles for swipe feed
    const { articles, nowShowingOlderNews, bucketBreakdown } = selectSwipeFeedArticles(
      allArticles,
      swipedIds,
      limit
    );

    // Convert to response format (compatible with existing frontend)
    const items = articles.map(article => ({
      id: article.id,
      headline: article.headline,
      brief: article.brief,
      source: article.source,
      url: article.url,
      publishedAt: article.published_at,
      firstSeenAt: article.fetched_at, // Use fetched_at as firstSeenAt
      category: article.category || 'Trending',
      imageUrl: article.image_url,
      primaryAsset: article.inferred_asset,
      assetConfidence: article.inferred_asset ? 40 : 0, // Simplified - could calculate actual confidence
      isProxyAsset: false, // Could be enhanced
      tier: article.freshness_bucket === 'hot' ? 'A' : 'B' as 'A' | 'B',
      expiresAt: new Date(new Date(article.fetched_at).getTime() + 30 * 60 * 1000).toISOString(),
      freshnessBucket: article.freshness_bucket,
      ageMinutes: article.age_minutes,
    }));

    console.log(`[Swipe Feed] Returning ${items.length} articles (${bucketBreakdown.hot} hot, ${bucketBreakdown.recent} recent, ${bucketBreakdown.older} older)`);

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
        nowShowingOlderNews,
        bucketBreakdown,
        bucket,
        timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Swipe Feed] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

