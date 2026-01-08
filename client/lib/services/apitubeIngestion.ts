/**
 * APITube Ingestion Service
 * High-recall fetch strategy for single ingestion pipeline
 * Fetches broadly without asset/ticker/company filtering
 */

import { fetchAPITubeNews, type APITubeArticle } from './apitube';

export interface IngestionOptions {
  timeWindowMinutes?: number; // Default: 60 minutes
  maxPerPage?: number; // Default: 100 (APITube maximum)
}

/**
 * Fetch news from APITube with high-recall strategy
 * - No filtering by asset, ticker, or company
 * - Fetches from last 60 minutes by default
 * - Uses maximum page size (100 articles per request)
 * - Returns raw APITube articles for normalization
 */
export async function fetchNewsForIngestion(
  options: IngestionOptions = {}
): Promise<APITubeArticle[]> {
  const {
    timeWindowMinutes = 60,
    maxPerPage = 100,
  } = options;

  const apiKey = process.env.APITUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('APITUBE_API_KEY environment variable is not set');
  }

  console.log(`[APITube Ingestion] Fetching news with high-recall strategy...`, {
    timeWindowMinutes,
    maxPerPage,
  });

  try {
    // Fetch from /v1/news/everything endpoint for maximum recall
    // No category filtering - we want broad coverage
    const articles = await fetchAPITubeNews({
      maxAgeMinutes: timeWindowMinutes,
      language: 'en',
      perPage: maxPerPage,
      page: 1,
      useCategoryEndpoint: false, // Use /everything for broad coverage
    });

    console.log(`[APITube Ingestion] ✅ Fetched ${articles.length} articles (no filtering applied)`);
    
    return articles;
  } catch (error) {
    console.error('[APITube Ingestion] Error fetching news:', error);
    throw error;
  }
}

/**
 * Fetch news with category/topic filters (optional enhancement)
 * Can be used for parallel fetching from multiple categories
 * Currently not used in main ingestion to maximize recall
 */
export async function fetchNewsFromCategories(
  categoryIds: string[] = [],
  timeWindowMinutes: number = 60
): Promise<APITubeArticle[]> {
  if (categoryIds.length === 0) {
    // No categories specified, use broad fetch
    return fetchNewsForIngestion({ timeWindowMinutes });
  }

  const apiKey = process.env.APITUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('APITUBE_API_KEY environment variable is not set');
  }

  console.log(`[APITube Ingestion] Fetching from ${categoryIds.length} categories...`);

  // Fetch from multiple categories in parallel
  const articlePromises = categoryIds.map(async (categoryId) => {
    try {
      const articles = await fetchAPITubeNews({
        maxAgeMinutes: timeWindowMinutes,
        language: 'en',
        perPage: 100,
        categoryId,
        useCategoryEndpoint: true,
      });
      return articles;
    } catch (error) {
      console.warn(`[APITube Ingestion] Failed to fetch category ${categoryId}:`, error);
      return [];
    }
  });

  const articleArrays = await Promise.all(articlePromises);
  const allArticles = articleArrays.flat();

  // Deduplicate by article ID (APITube's internal ID)
  const seenIds = new Set<number>();
  const uniqueArticles = allArticles.filter(article => {
    if (seenIds.has(article.id)) return false;
    seenIds.add(article.id);
    return true;
  });

  console.log(`[APITube Ingestion] ✅ Fetched ${uniqueArticles.length} unique articles from categories`);
  
  return uniqueArticles;
}

