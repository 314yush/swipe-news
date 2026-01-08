/**
 * APITube News API Service
 * Fetches real-time news from APITube's 500k+ verified sources
 * Maps APITube response format to our NormalizedNewsItem format
 */

export interface APITubeArticle {
  id: number;
  href: string; // Article URL (not 'url')
  title: string;
  description?: string;
  body?: string; // Full content (not 'content')
  published_at: string; // ISO 8601 timestamp
  image?: string; // Image URL (not 'image_url')
  language?: string; // Language code (not object)
  source: {
    id: number;
    domain: string; // Source name/domain (not 'name')
    home_page_url?: string;
    type?: string;
  };
  categories?: Array<{
    id: string;
    name: string;
  }>;
  topics?: Array<{
    id: string;
    name: string;
  }>;
  entities?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
}

export interface APITubeResponse {
  status: string;
  results: APITubeArticle[];
  limit: number;
  page: number;
  has_next_pages: boolean;
  next_page: string;
  has_previous_page: boolean;
  previous_page: string;
  request_id?: string;
  user_input?: any;
}

export interface FetchAPITubeNewsOptions {
  maxAgeMinutes?: number;
  category?: string;
  categoryId?: string; // APITube category ID (e.g., 'medtop:04000000')
  language?: string;
  perPage?: number;
  page?: number;
  useCategoryEndpoint?: boolean; // Use /v1/news/category instead of /v1/news/everything
}

/**
 * Map our internal categories to APITube category IDs
 * Using APITube's category endpoint: https://docs.apitube.io/platform/news-api/endpoints
 * Category IDs format: medtop:XXXXXXX
 * 
 * We'll fetch from multiple relevant categories in parallel for better coverage
 */
const RELEVANT_CATEGORIES = [
  // Cryptocurrency/Blockchain - most relevant for crypto tokens
  'cryptocurrency',
  'blockchain',
  // Technology - for tech stocks and tokens
  'technology',
  // Business/Finance - for stocks and forex
  'business',
  'finance',
  // Energy - for oil/energy commodities
  'energy',
  // Commodities - for metals, oil
  'commodities',
];

/**
 * Fetch news from APITube API with retry logic for 5xx errors
 * Retries up to 3 times with exponential backoff for server errors
 */
export async function fetchAPITubeNews(
  options: FetchAPITubeNewsOptions = {},
  retryCount: number = 0
): Promise<APITubeArticle[]> {
  const apiKey = process.env.APITUBE_API_KEY;
  
  if (!apiKey) {
    throw new Error('APITUBE_API_KEY environment variable is not set');
  }

  const {
    maxAgeMinutes = 24 * 60,
    category,
    categoryId,
    language = 'en',
    perPage = 200,
    page = 1,
    useCategoryEndpoint = false,
  } = options;

  // Build query parameters
  // According to APITube docs: https://docs.apitube.io/platform/news-api/parameters
  const params = new URLSearchParams();
  
  // CRITICAL: APITube per_page parameter has a valid range
  // Based on error ER0171 "Limit is out of range", we need to validate the range
  // Common API limits: typically 1-100 for most endpoints
  // Let's use a safe default range: 1-100 (works for all plans)
  const safePerPage = Math.max(1, Math.min(perPage, 100)); // Cap at 100 to avoid ER0171 error
  params.set('per_page', safePerPage.toString());
  
  // Log if we had to adjust the value
  if (perPage !== safePerPage) {
    console.warn(`[APITube] ⚠️ Adjusted per_page from ${perPage} to ${safePerPage} (valid range: 1-100)`);
  }
  params.set('page', page.toString());
  params.set('language.code', language);
  
  // Add time-based filtering for real-time news
  // APITube uses published_at.start for start date filtering
  // Format: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DD)
  if (maxAgeMinutes && maxAgeMinutes < 24 * 60) {
    const startDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    // Use ISO format: YYYY-MM-DDTHH:mm:ssZ
    const startDateISO = startDate.toISOString();
    params.set('published_at.start', startDateISO);
    console.log(`[APITube] Using time filter: published_at.start=${startDateISO} (${maxAgeMinutes} minutes ago)`);
  }
  
  // Note: APITube API has a hard limit of 100 articles per request
  // This is separate from plan-based rate limits (requests per time window)

  // Add category filter if specified
  // Note: APITube uses category IDs, but we'll filter client-side for now
  // to ensure compatibility. Can be optimized later with proper category ID mapping.
  // For now, fetch all categories and filter by our internal categories after normalization

  // Use category endpoint if categoryId provided, otherwise use everything endpoint
  // Category endpoint: /v1/news/category?category.id=medtop:XXXXXXX
  // See: https://docs.apitube.io/platform/news-api/endpoints
  let baseUrl = 'https://api.apitube.io/v1/news/everything';
  
  if (useCategoryEndpoint && categoryId) {
    baseUrl = 'https://api.apitube.io/v1/news/category';
    params.set('category.id', categoryId);
    console.log(`[APITube] Using category endpoint with category.id=${categoryId}`);
  }
  
  const url = `${baseUrl}?${params.toString()}`;

  try {
    if (retryCount > 0) {
      console.log(`[APITube] Retry attempt ${retryCount}/3...`);
    } else {
      console.log(`[APITube] Fetching news from APITube API...`, {
        url: url.replace(apiKey, '***'),
        maxAgeMinutes,
        category,
        perPage,
      });
    }

    const controller = new AbortController();
    // Reduced timeout for faster failure (15 seconds for speed priority)
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'SwipeTrader/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const statusCode = response.status;
      
      // Handle 429 Rate Limit Exceeded - check reset time and provide helpful message
      if (statusCode === 429) {
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
        const resetSeconds = rateLimitReset ? parseInt(rateLimitReset, 10) : 0;
        const resetMinutes = Math.ceil(resetSeconds / 60);
        
        console.error(`[APITube] ❌ RATE LIMIT EXCEEDED (429)`);
        console.error(`[APITube] Rate limit: ${rateLimitLimit || 'unknown'} requests per window`);
        console.error(`[APITube] Rate limit resets in: ${resetMinutes} minutes (${resetSeconds} seconds)`);
        console.error(`[APITube] See: https://docs.apitube.io/platform/news-api/rate-limits`);
        
        throw new Error(`APITube rate limit exceeded. Limit: ${rateLimitLimit || 'unknown'} requests per window. Resets in ${resetMinutes} minutes. Please wait or upgrade your plan.`);
      }
      
      // Retry on 5xx errors (server errors) - these are often transient
      if (statusCode >= 500 && statusCode < 600 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`[APITube] ⚠️ Server error ${statusCode}, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
        if (errorText) {
          console.warn(`[APITube] Error response: ${errorText.substring(0, 200)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchAPITubeNews(options, retryCount + 1);
      }
      
      // Handle 400 Bad Request - parse error details for helpful messages
      if (statusCode === 400) {
        let errorMessage = `APITube API returned 400: Bad Request`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errors && errorData.errors.length > 0) {
            const error = errorData.errors[0];
            errorMessage = `APITube API error (${error.code || 'ER0171'}): ${error.message || 'Bad Request'}`;
            
            // Special handling for ER0171 (Limit out of range)
            if (error.code === 'ER0171' || error.message?.includes('out of range')) {
              console.error(`[APITube] ❌ ER0171: Limit is out of range`);
              console.error(`[APITube] The per_page parameter must be between 1-100`);
              console.error(`[APITube] See: ${error.links?.about || 'https://docs.apitube.io/platform/news-api/http-response-codes'}`);
              errorMessage = `APITube API error: per_page limit is out of range. Valid range is 1-100. Please use a value within this range.`;
            }
          }
        } catch (e) {
          // If JSON parsing fails, use the raw error text
          if (errorText) {
            errorMessage = `APITube API returned 400: ${errorText.substring(0, 200)}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      // Don't retry on other 4xx errors (client errors) or after max retries
      console.error(`[APITube] API error: ${statusCode} ${response.statusText}`);
      if (errorText) {
        console.error(`[APITube] Error response: ${errorText.substring(0, 500)}`);
      }
      
      if (statusCode >= 500) {
        throw new Error(`APITube API server error (${statusCode}): ${response.statusText}. This is a temporary issue on APITube's servers. Please try again in a few moments.`);
      } else {
        throw new Error(`APITube API returned ${statusCode}: ${response.statusText}`);
      }
    }

    // Check rate limit headers (from APITube docs: https://docs.apitube.io/platform/news-api/rate-limits)
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');
    
    if (rateLimitRemaining) {
      const remaining = parseInt(rateLimitRemaining, 10);
      const limit = parseInt(rateLimitLimit || '0', 10);
      const resetSeconds = rateLimitReset ? parseInt(rateLimitReset, 10) : 0;
      const resetMinutes = Math.ceil(resetSeconds / 60);
      const usagePercent = limit > 0 ? ((limit - remaining) / limit * 100).toFixed(1) : 0;
      
      // Critical: Less than 5% remaining
      if (remaining < limit * 0.05) {
        console.error(`[APITube] 🚨 CRITICAL: Rate limit almost exhausted! ${remaining}/${limit} requests remaining (${usagePercent}% used)`);
        console.error(`[APITube] Rate limit resets in: ${resetMinutes} minutes`);
        console.error(`[APITube] Plan limits: Free=30/30min, Basic=1500/15min, Pro=3000/15min, Corporate=5000/15min`);
      }
      // Warning: Less than 20% remaining
      else if (remaining < limit * 0.20) {
        console.warn(`[APITube] ⚠️ WARNING: Low rate limit: ${remaining}/${limit} requests remaining (${usagePercent}% used)`);
        console.warn(`[APITube] Rate limit resets in: ${resetMinutes} minutes`);
      }
      // Info: Log for monitoring
      else {
        console.log(`[APITube] Rate limit: ${remaining}/${limit} requests remaining (${usagePercent}% used, resets in ${resetMinutes}min)`);
      }
    }

    const data: APITubeResponse = await response.json();

    // APITube returns articles in 'results' array, not 'data'
    const articles = data.results || [];
    
    if (retryCount > 0) {
      console.log(`[APITube] ✅ Successfully fetched ${articles.length} articles after ${retryCount} retries`);
    } else {
      console.log(`[APITube] ✅ Fetched ${articles.length} articles (status: ${data.status}, limit: ${data.limit}, page: ${data.page})`);
    }

    return articles;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[APITube] Request timed out after 15 seconds');
      throw new Error('APITube API request timed out after 15 seconds');
    }
    
    // Don't retry on network errors or timeouts - these are usually not transient
    if (retryCount > 0) {
      console.error(`[APITube] ❌ Failed after ${retryCount} retries:`, error);
    } else {
      console.error('[APITube] Error fetching news:', error);
    }
    throw error;
  }
}

/**
 * Clean HTML from text (similar to RSS cleaning)
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
 * Convert APITube article to RSSItem-like format for compatibility with existing normalization
 */
export function convertAPITubeToRSSItem(article: APITubeArticle): {
  title: string;
  description: string | null;
  link: string;
  isoDate: string;
  imageUrl: string | null;
} {
  return {
    title: cleanText(article.title),
    description: article.description 
      ? cleanText(article.description) 
      : (article.body ? cleanText(article.body.substring(0, 500)) : null), // Use body as fallback, limit length
    link: article.href, // APITube uses 'href' not 'url'
    isoDate: article.published_at,
    imageUrl: article.image || null, // APITube uses 'image' not 'image_url'
  };
}

