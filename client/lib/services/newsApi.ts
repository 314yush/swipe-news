/**
 * News API Service
 * Fetches news from external APIs and stores in Supabase
 * 
 * Supported providers:
 * - NewsAPI.org (free tier available)
 * - Alpha Vantage News
 * - CryptoPanic API (crypto-focused)
 * - Custom RSS aggregator
 */

import { getSupabase } from './supabase';

/**
 * News API Provider Configuration
 */
export interface NewsProviderConfig {
  provider: 'newsapi' | 'alphavantage' | 'cryptopanic' | 'rss';
  apiKey?: string;
  enabled: boolean;
}

/**
 * News article interface matching Supabase schema
 */
export interface NewsArticle {
  headline: string;
  brief?: string;
  source: string;
  url: string;
  image_url?: string | null;
  category?: string;
  published_at: string;
}

/**
 * NewsAPI.org implementation
 * https://newsapi.org/
 */
async function fetchFromNewsAPI(apiKey: string, category?: string): Promise<NewsArticle[]> {
  const categoryMap: Record<string, string> = {
    'Crypto': 'cryptocurrency',
    'Stocks': 'business',
    'Forex': 'business',
    'Commodities': 'business',
    'Trending': 'general',
  };

  const newsCategory = category ? categoryMap[category] || 'general' : 'general';
  
  const url = `https://newsapi.org/v2/top-headlines?category=${newsCategory}&apiKey=${apiKey}&pageSize=20`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.articles || []).map((article: any) => ({
      headline: article.title || '',
      brief: article.description || '',
      source: article.source?.name || 'Unknown',
      url: article.url || '',
      image_url: article.urlToImage || null,
      category: category || 'Trending',
      published_at: article.publishedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error);
    throw error;
  }
}

/**
 * Alpha Vantage News implementation
 * https://www.alphavantage.co/documentation/#news-sentiment
 */
async function fetchFromAlphaVantage(apiKey: string, category?: string): Promise<NewsArticle[]> {
  const topics = category === 'Crypto' ? 'CRYPTO' : 'TOP_NEWS';
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${apiKey}&limit=20`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.feed || []).map((article: any) => ({
      headline: article.title || '',
      brief: article.summary || '',
      source: article.source || 'Unknown',
      url: article.url || '',
      image_url: article.banner_image || null,
      category: category || 'Trending',
      published_at: article.time_published || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching from Alpha Vantage:', error);
    throw error;
  }
}

/**
 * CryptoPanic API implementation
 * https://cryptopanic.com/developers/api/
 */
async function fetchFromCryptoPanic(apiKey: string): Promise<NewsArticle[]> {
  const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}&public=true&kind=news&filter=hot`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CryptoPanic error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.results || []).map((article: any) => ({
      headline: article.title || '',
      brief: article.title || '', // CryptoPanic doesn't provide descriptions
      source: 'CryptoPanic',
      url: article.url || '',
      image_url: null,
      category: 'Crypto',
      published_at: article.published_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching from CryptoPanic:', error);
    throw error;
  }
}

/**
 * Save news articles to Supabase
 * Deduplicates based on URL
 */
async function saveNewsToSupabase(articles: NewsArticle[]): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not configured, skipping news save');
    return 0;
  }

  let savedCount = 0;

  for (const article of articles) {
    try {
      // Check if article already exists (by URL)
      const { data: existing } = await supabase
        .from('news_cache')
        .select('id')
        .eq('url', article.url)
        .single();

      if (existing) {
        continue; // Skip duplicates
      }

      // Insert new article
      const { error } = await supabase
        .from('news_cache')
        .insert({
          headline: article.headline,
          brief: article.brief,
          source: article.source,
          url: article.url,
          image_url: article.image_url,
          category: article.category || 'Trending',
          published_at: article.published_at,
        });

      if (!error) {
        savedCount++;
      } else {
        console.error('Error saving article:', error);
      }
    } catch (error) {
      console.error('Error processing article:', error);
    }
  }

  return savedCount;
}

/**
 * Fetch news from configured provider
 * @param config - Provider configuration
 * @param category - News category filter
 */
export async function fetchNewsFromProvider(
  config: NewsProviderConfig,
  category?: string
): Promise<NewsArticle[]> {
  if (!config.enabled || !config.apiKey) {
    throw new Error(`Provider ${config.provider} is not enabled or missing API key`);
  }

  let articles: NewsArticle[] = [];

  switch (config.provider) {
    case 'newsapi':
      articles = await fetchFromNewsAPI(config.apiKey!, category);
      break;
    case 'alphavantage':
      articles = await fetchFromAlphaVantage(config.apiKey!, category);
      break;
    case 'cryptopanic':
      articles = await fetchFromCryptoPanic(config.apiKey!);
      break;
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }

  // Save to Supabase
  if (articles.length > 0) {
    const savedCount = await saveNewsToSupabase(articles);
    console.log(`Saved ${savedCount} new articles to Supabase`);
  }

  return articles;
}

/**
 * Get default news provider configuration from environment variables
 */
export function getDefaultNewsProvider(): NewsProviderConfig | null {
  // Check for NewsAPI
  if (process.env.NEXT_PUBLIC_NEWSAPI_KEY) {
    return {
      provider: 'newsapi',
      apiKey: process.env.NEXT_PUBLIC_NEWSAPI_KEY,
      enabled: true,
    };
  }

  // Check for Alpha Vantage
  if (process.env.NEXT_PUBLIC_ALPHAVANTAGE_KEY) {
    return {
      provider: 'alphavantage',
      apiKey: process.env.NEXT_PUBLIC_ALPHAVANTAGE_KEY,
      enabled: true,
    };
  }

  // Check for CryptoPanic
  if (process.env.NEXT_PUBLIC_CRYPTOPANIC_KEY) {
    return {
      provider: 'cryptopanic',
      apiKey: process.env.NEXT_PUBLIC_CRYPTOPANIC_KEY,
      enabled: true,
    };
  }

  return null;
}

/**
 * Fetch and cache news articles
 * This should be called from a background job or edge function
 */
export async function fetchAndCacheNews(category?: string): Promise<NewsArticle[]> {
  const provider = getDefaultNewsProvider();
  
  if (!provider) {
    console.warn('No news provider configured. Set NEXT_PUBLIC_NEWSAPI_KEY, NEXT_PUBLIC_ALPHAVANTAGE_KEY, or NEXT_PUBLIC_CRYPTOPANIC_KEY');
    return [];
  }

  try {
    return await fetchNewsFromProvider(provider, category);
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export default {
  fetchNewsFromProvider,
  getDefaultNewsProvider,
  fetchAndCacheNews,
  saveNewsToSupabase,
};

