/**
 * Main Feed API Route
 * Returns articles for main feed (24-hour window)
 * Includes swipe interaction state
 * Groups by freshness buckets
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getArticlesInWindow,
  getStorageStats,
} from '@/lib/services/articleStorage';
import { type NormalizedArticle } from '@/lib/services/articleNormalizer';

/**
 * Get user's swiped article IDs and interaction types
 * For now, we'll accept them as query parameter
 * In production, this should come from database
 */
function getUserInteractions(request: NextRequest): Map<string, 'dismissed' | 'longed' | 'shorted'> {
  const interactionsParam = request.nextUrl.searchParams.get('interactions');
  if (interactionsParam) {
    try {
      const interactions = JSON.parse(interactionsParam) as Record<string, 'dismissed' | 'longed' | 'shorted'>;
      return new Map(Object.entries(interactions));
    } catch {
      return new Map();
    }
  }
  
  return new Map();
}

/**
 * Group articles by freshness bucket
 */
function groupByBucket(articles: NormalizedArticle[]): {
  hot: NormalizedArticle[];
  recent: NormalizedArticle[];
  older: NormalizedArticle[];
} {
  return {
    hot: articles.filter(a => a.freshness_bucket === 'hot'),
    recent: articles.filter(a => a.freshness_bucket === 'recent'),
    older: articles.filter(a => a.freshness_bucket === 'older'),
  };
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);
    const category = request.nextUrl.searchParams.get('category');
    const interactions = getUserInteractions(request);

    // Get articles from last 24 hours
    const articles = getArticlesInWindow(24 * 60);

    // Filter by category if specified
    let filteredArticles = articles;
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
      const normalizedCategory = categoryMap[category] || category.toLowerCase();
      filteredArticles = articles.filter(a => a.category === normalizedCategory);
    }

    // Sort by published_at DESC
    filteredArticles.sort((a, b) => {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Apply limit
    const limitedArticles = filteredArticles.slice(0, limit);

    // Group by freshness buckets
    const buckets = groupByBucket(limitedArticles);

    // Convert to response format
    const items = limitedArticles.map(article => {
      const interaction = interactions.get(article.id);
      
      return {
        id: article.id,
        headline: article.headline,
        brief: article.brief,
        source: article.source,
        url: article.url,
        publishedAt: article.published_at,
        firstSeenAt: article.fetched_at,
        category: article.category || 'Trending',
        imageUrl: article.image_url,
        primaryAsset: article.inferred_asset,
        assetConfidence: article.inferred_asset ? 40 : 0,
        isProxyAsset: false,
        tier: article.freshness_bucket === 'hot' ? 'A' : 'B' as 'A' | 'B',
        expiresAt: new Date(new Date(article.fetched_at).getTime() + 30 * 60 * 1000).toISOString(),
        freshnessBucket: article.freshness_bucket,
        ageMinutes: article.age_minutes,
        interaction: interaction || null, // Include interaction state
      };
    });

    console.log(`[Main Feed] Returning ${items.length} articles (${buckets.hot.length} hot, ${buckets.recent.length} recent, ${buckets.older.length} older)`);

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
      buckets: {
        hot: buckets.hot.length,
        recent: buckets.recent.length,
        older: buckets.older.length,
      },
      stats: getStorageStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Main Feed] Error:', error);
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

