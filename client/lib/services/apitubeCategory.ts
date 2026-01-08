/**
 * APITube Category Endpoint Service
 * Fetches news from specific categories using /v1/news/category endpoint
 * See: https://docs.apitube.io/platform/news-api/endpoints
 */

import { fetchAPITubeNews, type APITubeArticle } from './apitube';

/**
 * APITube Category IDs (medtop:XXXXXXX format)
 * These are common category IDs for finance, crypto, tech news
 * Full list: https://docs.apitube.io/platform/news-api/list-of-categories
 * 
 * Note: You may need to look up the exact IDs from APITube's category list
 */
const CATEGORY_IDS = {
  // Economy, Business and Finance - medtop:04000000 (from docs example)
  BUSINESS_FINANCE: 'medtop:04000000',
  // Add more category IDs as needed
  // You can find them at: https://docs.apitube.io/platform/news-api/list-of-categories
};

/**
 * Fetch news from multiple relevant categories in parallel
 * Categories: Business/Finance, Technology, Cryptocurrency (if available)
 */
export async function fetchNewsFromCategories(): Promise<APITubeArticle[]> {
  const apiKey = process.env.APITUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('APITUBE_API_KEY environment variable is not set');
  }

  // Fetch from relevant categories in parallel
  // Using /v1/news/category endpoint for better targeting
  const categoryQueries = [
    // Business/Finance category
    {
      categoryId: CATEGORY_IDS.BUSINESS_FINANCE,
      name: 'Business/Finance',
    },
    // Add more categories as we discover their IDs
  ];

  console.log(`[APITube Categories] Fetching from ${categoryQueries.length} categories...`);

  const articlePromises = categoryQueries.map(async ({ categoryId, name }) => {
    try {
      const url = `https://api.apitube.io/v1/news/category?category.id=${categoryId}&per_page=100&language.code=en`;
      
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[APITube Categories] Failed to fetch ${name}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const articles = data.results || [];
      console.log(`[APITube Categories] ✅ Fetched ${articles.length} articles from ${name}`);
      return articles;
    } catch (error) {
      console.warn(`[APITube Categories] Error fetching ${name}:`, error);
      return [];
    }
  });

  const articleArrays = await Promise.all(articlePromises);
  const allArticles = articleArrays.flat();

  // Deduplicate by article ID
  const seenIds = new Set<number>();
  const uniqueArticles = allArticles.filter(article => {
    if (seenIds.has(article.id)) return false;
    seenIds.add(article.id);
    return true;
  });

  console.log(`[APITube Categories] ✅ Total unique articles: ${uniqueArticles.length}`);
  return uniqueArticles;
}

