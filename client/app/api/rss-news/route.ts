/**
 * Next.js API Route for RSS News Ingestion
 * Fetches RSS feeds server-side and returns normalized news
 * Only shows news relevant to Avantis trading pairs
 * 
 * GLOBAL CACHING: News is cached globally and refreshed every 15 minutes
 * All users see the same news, reducing API calls and ensuring consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { findRelevantPairs, isRelevantToTradingPairs, mapPairCategoryToNewsCategory } from '@/lib/config/tradingPairs';

// Global in-memory cache for news
interface CachedNews {
  items: NormalizedNewsItem[];
  timestamp: number;
  maxAgeMinutes: number;
}

// Cache storage: key = `${maxAgeMinutes}-${category || 'all'}`
const newsCache = new Map<string, CachedNews>();

// Cache TTL: 15 minutes (900 seconds) for swipe feed, 5 minutes for feed page
const CACHE_TTL_15MIN = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_TTL_24HR = 5 * 60 * 1000; // 5 minutes for 24hr feed (less critical)

/**
 * Cleanup old cache entries (runs on each request to prevent memory leaks)
 */
function cleanupCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, cached] of newsCache.entries()) {
    const age = now - cached.timestamp;
    const ttl = cached.maxAgeMinutes <= 15 ? CACHE_TTL_15MIN : CACHE_TTL_24HR;
    
    // Remove entries older than 2x TTL (stale cache)
    if (age > ttl * 2) {
      newsCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RSS API] 🧹 Cleaned up ${cleaned} stale cache entries`);
  }
}

/**
 * Get cache key for a request
 */
function getCacheKey(maxAgeMinutes: number, category?: string | null): string {
  return `${maxAgeMinutes}-${category || 'all'}`;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(cached: CachedNews, maxAgeMinutes: number): boolean {
  const now = Date.now();
  const age = now - cached.timestamp;
  
  // For 15-minute feed, use 15-minute cache TTL
  // For 24-hour feed, use 5-minute cache TTL
  const ttl = maxAgeMinutes <= 15 ? CACHE_TTL_15MIN : CACHE_TTL_24HR;
  
  return age < ttl && cached.maxAgeMinutes === maxAgeMinutes;
}

// RSS Feed Configuration - Organized by category
// Prioritized for high-frequency publishing to ensure 30-40+ items in 15-minute window
const RSS_FEEDS = [
  // 🪙 CRYPTO (Tier 1 - breaking, high frequency)
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', category: 'crypto' },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', category: 'crypto' },
  { url: 'https://bitcoinmagazine.com/.rss/full/', name: 'Bitcoin Magazine', category: 'crypto' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk Markets', category: 'crypto' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml', name: 'CoinDesk Breaking', category: 'crypto' },
  { url: 'https://beincrypto.com/feed/', name: 'BeInCrypto', category: 'crypto' },
  { url: 'https://cryptopotato.com/feed/', name: 'CryptoPotato', category: 'crypto' },
  { url: 'https://ambcrypto.com/feed/', name: 'AMBCrypto', category: 'crypto' },
  
  // 🪙 CRYPTO (Tier 2 - ecosystem + regulation)
  { url: 'https://decrypt.co/feed', name: 'Decrypt', category: 'crypto' },
  { url: 'https://theblock.co/rss.xml', name: 'The Block', category: 'crypto' },
  { url: 'https://cryptoslate.com/feed/', name: 'CryptoSlate', category: 'crypto' },
  { url: 'https://u.today/rss', name: 'U.Today', category: 'crypto' },
  { url: 'https://cryptonews.com/news/feed/', name: 'CryptoNews', category: 'crypto' },
  { url: 'https://coingape.com/feed/', name: 'CoinGape', category: 'crypto' },
  { url: 'https://zycrypto.com/feed/', name: 'ZyCrypto', category: 'crypto' },
  { url: 'https://cryptonews.net/feed/', name: 'CryptoNews.net', category: 'crypto' },
  
  // 💻 TECH (Tier 1 - high frequency)
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: 'tech' },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'tech' },
  { url: 'https://www.wired.com/feed/rss', name: 'Wired', category: 'tech' },
  { url: 'https://feeds.feedburner.com/oreilly/radar', name: 'O\'Reilly Radar', category: 'tech' },
  { url: 'https://www.theverge.com/rss/tech/index.xml', name: 'The Verge Tech', category: 'tech' },
  { url: 'https://www.cnet.com/rss/news/', name: 'CNET News', category: 'tech' },
  { url: 'https://www.digitaltrends.com/feed/', name: 'Digital Trends', category: 'tech' },
  
  // 💻 TECH (Tier 2 - AI / dev infra)
  { url: 'https://venturebeat.com/feed/', name: 'VentureBeat', category: 'tech' },
  { url: 'https://arstechnica.com/feed/', name: 'Ars Technica', category: 'tech' },
  { url: 'https://www.engadget.com/rss.xml', name: 'Engadget', category: 'tech' },
  { url: 'https://www.zdnet.com/rss.xml', name: 'ZDNet', category: 'tech' },
  { url: 'https://www.tomshardware.com/feeds/all', name: 'Tom\'s Hardware', category: 'tech' },
  
  // 💰 FINANCE / MARKETS (Tier 1 - institutional speed, wire services)
  { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business', category: 'finance' },
  { url: 'https://feeds.reuters.com/reuters/marketsNews', name: 'Reuters Markets', category: 'finance' },
  { url: 'https://feeds.reuters.com/reuters/breakingviews', name: 'Reuters Breakingviews', category: 'finance' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', name: 'CNBC Markets', category: 'finance' },
  { url: 'https://www.cnbc.com/id/15839069/device/rss/rss.html', name: 'CNBC Top News', category: 'finance' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC Breaking News', category: 'finance' },
  { url: 'https://www.marketwatch.com/rss/topstories', name: 'MarketWatch Top Stories', category: 'finance' },
  { url: 'https://www.marketwatch.com/rss/markets', name: 'MarketWatch Markets', category: 'finance' },
  { url: 'https://www.marketwatch.com/rss/headlines', name: 'MarketWatch Headlines', category: 'finance' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', category: 'finance' },
  { url: 'https://feeds.bloomberg.com/markets/headlines.rss', name: 'Bloomberg Headlines', category: 'finance' },
  { url: 'https://seekingalpha.com/feed.xml', name: 'Seeking Alpha', category: 'finance' },
  
  // 💰 FINANCE / MARKETS (Tier 2 - macro context)
  { url: 'https://www.ft.com/rss/home', name: 'Financial Times', category: 'finance' },
  { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com', category: 'finance' },
  { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline', name: 'Yahoo Finance', category: 'finance' },
  { url: 'https://www.wsj.com/xml/rss/3_7085.xml', name: 'WSJ Markets', category: 'finance' },
  { url: 'https://www.wsj.com/xml/rss/3_7014.xml', name: 'WSJ Business', category: 'finance' },
  { url: 'https://www.barrons.com/feed', name: 'Barron\'s', category: 'finance' },
  { url: 'https://www.investors.com/feed/', name: 'Investor\'s Business Daily', category: 'finance' },
  
  // ⚡ ENERGY (Tier 1 - high frequency)
  { url: 'https://www.reuters.com/rssFeed/energyNews', name: 'Reuters Energy', category: 'energy' },
  { url: 'https://www.eia.gov/rss/energy_today.xml', name: 'EIA Energy Today', category: 'energy' },
  { url: 'https://apnews.com/hub/energy?utm_source=rss', name: 'AP Energy', category: 'energy' },
  
  // ⚡ ENERGY (Tier 2)
  { url: 'https://oilprice.com/rss/main', name: 'OilPrice.com', category: 'energy' },
  { url: 'https://www.spglobal.com/commodityinsights/en/rss-feed', name: 'S&P Commodity Insights', category: 'energy' },
  
  // 🥇 METALS (Gold, Silver, Precious Metals)
  { url: 'https://www.kitco.com/rss/kitco-news.xml', name: 'Kitco Metals', category: 'metals' },
  { url: 'https://www.gold.org/rss', name: 'World Gold Council', category: 'metals' },
  { url: 'https://www.silverinstitute.org/feed/', name: 'Silver Institute', category: 'metals' },
  { url: 'https://www.mining.com/feed/', name: 'Mining.com', category: 'metals' },
  { url: 'https://www.bullionvault.com/rss/news', name: 'BullionVault News', category: 'metals' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business (Metals)', category: 'metals' },
  
  // 🏛️ POLITICS / POLICY (Tier 1 - fast wires only)
  { url: 'https://feeds.reuters.com/reuters/politicsNews', name: 'Reuters Politics', category: 'politics' },
  { url: 'https://apnews.com/hub/politics?utm_source=rss', name: 'AP Politics', category: 'politics' },
  { url: 'https://apnews.com/hub/apf-topnews?utm_source=rss', name: 'AP Top News', category: 'politics' },
  
  // 🏛️ POLITICS / POLICY (Tier 2)
  { url: 'https://www.politico.com/rss/politics08.xml', name: 'Politico', category: 'politics' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', category: 'politics' },
  
  // 🏢 BUSINESS (Tier 1 - corporate, M&A, earnings, high frequency)
  { url: 'https://feeds.reuters.com/reuters/companyNews', name: 'Reuters Company News', category: 'business' },
  { url: 'https://apnews.com/hub/business?utm_source=rss', name: 'AP Business', category: 'business' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', name: 'CNBC Business', category: 'business' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Business', category: 'business' },
  { url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html', name: 'CNBC Earnings', category: 'business' },
  
  // 🏢 BUSINESS (Tier 2)
  { url: 'https://fortune.com/feed/', name: 'Fortune', category: 'business' },
  { url: 'https://www.businessinsider.com/rss', name: 'Business Insider', category: 'business' },
  { url: 'https://www.forbes.com/real-time/feed2/', name: 'Forbes Real-Time', category: 'business' },
  { url: 'https://www.fool.com/feeds/index.aspx', name: 'Motley Fool', category: 'business' },
  { url: 'https://www.thestreet.com/.rss/full', name: 'TheStreet', category: 'business' },
  
  // TRENDING (general news - wire services, highest frequency)
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top News', category: 'trending' },
  { url: 'https://apnews.com/rss', name: 'AP News', category: 'trending' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', name: 'Reuters World', category: 'trending' },
  { url: 'https://www.bbc.com/news/rss.xml', name: 'BBC News', category: 'trending' },
  { url: 'https://rss.cnn.com/rss/edition.rss', name: 'CNN Top Stories', category: 'trending' },
  { url: 'https://rss.cnn.com/rss/cnn_latest.rss', name: 'CNN Latest', category: 'trending' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/world', name: 'NBC News World', category: 'trending' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/business', name: 'NBC News Business', category: 'trending' },
  { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/rss.xml', name: 'NYT Business', category: 'trending' },
];

interface RSSItem {
  title?: string | null;
  description?: string | null;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  guid?: string;
  imageUrl?: string | null; // Cover image URL
}

interface NormalizedNewsItem {
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

// Simple hash function
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Extract image URL from HTML content
 * Looks for <img> tags, <enclosure>, <media:content>, or <image> tags
 */
function extractImageUrl(html: string, description?: string | null): string | null {
  if (!html && !description) return null;
  
  const content = html || description || '';
  
  // Try <enclosure> tag (RSS 2.0) - can be in item or description
  const enclosureMatch = content.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image[^"']*["']/i) ||
                     content.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i);
  if (enclosureMatch) {
    const url = enclosureMatch[1].trim();
    if (url && !url.startsWith('data:')) return url;
  }
  
  // Try <media:content> tag (Media RSS)
  const mediaMatch = content.match(/<media:content[^>]*url=["']([^"']+)["']/i) || 
                     content.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (mediaMatch) {
    const url = mediaMatch[1].trim();
    if (url && !url.startsWith('data:')) return url;
  }
  
  // Try <image> tag
  const imageTagMatch = content.match(/<image[^>]*>[\s\S]*?<url[^>]*>([\s\S]*?)<\/url>/i);
  if (imageTagMatch) {
    const url = imageTagMatch[1].trim();
    if (url && !url.startsWith('data:')) return url;
  }
  
  // Try <img> tag in description (most common)
  const imgMatch = content.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (imgMatch) {
    const imgUrl = imgMatch[1].trim();
    // Filter out data URIs, tracking pixels, and very small images
    if (imgUrl && 
        !imgUrl.startsWith('data:') && 
        !imgUrl.includes('1x1') && 
        !imgUrl.includes('pixel') &&
        !imgUrl.includes('spacer') &&
        !imgUrl.includes('tracking') &&
        imgUrl.length > 10) { // Basic validation
      return imgUrl;
    }
  }
  
  return null;
}

// Clean HTML/CDATA from text
function cleanText(text: string): string {
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
    .replace(/&rsquo;/g, '\u2019') // Right single quotation mark
    .replace(/&lsquo;/g, '\u2018') // Left single quotation mark
    .replace(/&rdquo;/g, '\u201D') // Right double quotation mark
    .replace(/&ldquo;/g, '\u201C') // Left double quotation mark
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned;
}

// Parse RSS XML
function parseRSSFeed(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  try {
    // Extract items from RSS 2.0 format
    const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    for (const match of itemMatches) {
      const itemXml = match[1];
      const item: RSSItem = {};
      
      const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        item.title = cleanText(titleMatch[1]) || null;
      }
      
      const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      if (descMatch) {
        const descContent = descMatch[1];
        // Extract image before cleaning description
        item.imageUrl = extractImageUrl(descContent) || null;
        item.description = cleanText(descContent) || null;
      }
      
      // Try <enclosure> tag for images
      if (!item.imageUrl) {
        const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image[^"']*["']/i);
        if (enclosureMatch) {
          item.imageUrl = enclosureMatch[1].trim();
        }
      }
      
      // Try <media:content> or <media:thumbnail>
      if (!item.imageUrl) {
        const mediaMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i) || 
                          itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
        if (mediaMatch) {
          item.imageUrl = mediaMatch[1].trim();
        }
      }
      
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (linkMatch) {
        item.link = linkMatch[1].trim();
      }
      
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      if (pubDateMatch) {
        item.pubDate = pubDateMatch[1].trim();
      }
      
      const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      if (guidMatch) {
        item.guid = guidMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
      }
      
      if (item.title || item.link) {
        items.push(item);
      }
    }
    
    // Try Atom format if no RSS items found
    if (items.length === 0) {
      const entryMatches = xmlText.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
      for (const match of entryMatches) {
        const entryXml = match[1];
        const item: RSSItem = {};
        
        const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
          item.title = cleanText(titleMatch[1]) || null;
        }
        
        const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
        if (linkMatch) item.link = linkMatch[1].trim();
        
        const updatedMatch = entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
        if (updatedMatch) item.isoDate = updatedMatch[1].trim();
        
        const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
        if (summaryMatch) {
          const summaryContent = summaryMatch[1];
          // Extract image before cleaning summary
          item.imageUrl = extractImageUrl(summaryContent) || null;
          item.description = cleanText(summaryContent) || null;
        }
        
        // Try <media:content> or <media:thumbnail> in Atom feeds
        if (!item.imageUrl) {
          const mediaMatch = entryXml.match(/<media:content[^>]*url=["']([^"']+)["']/i) || 
                            entryXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
          if (mediaMatch) {
            item.imageUrl = mediaMatch[1].trim();
          }
        }
        
        if (item.title || item.link) {
          items.push(item);
        }
      }
    }
  } catch (error) {
    console.error('Error parsing RSS:', error);
  }
  
  return items;
}

// Normalize RSS item
function normalizeItem(item: RSSItem, source: string, feedCategory: string, maxAgeMinutes: number = 24 * 60): NormalizedNewsItem | null {
  if (!item.title || !item.link) return null;
  
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();
  const pubDate = new Date(publishedAt);
  
  // Skip items with invalid dates
  if (isNaN(pubDate.getTime())) return null;
  
  const ageMinutes = (Date.now() - pubDate.getTime()) / (1000 * 60);
  
  // Strict filter: Skip items older than maxAgeMinutes (critical for 15-minute swipe feed)
  // This ensures swipe feed only shows news from the last 15 minutes exactly
  if (ageMinutes > maxAgeMinutes) return null;
  
  // Clean title and description
  const title = cleanText(item.title);
  const description = item.description ? cleanText(item.description) : null;
  const url = item.link.trim();
  
  const id = hashString(`${source}|${title}`);
  
  // Check if news is relevant to any trading pairs
  if (!isRelevantToTradingPairs(title, description)) {
    return null; // Skip news not relevant to tradable markets
  }
  
  // Find relevant trading pairs
  const relevantPairs = findRelevantPairs(title, description);
  const relevantPairSymbols = relevantPairs.map(p => p.pair);
  
  // Determine category from trading pairs (use first match)
  let category = feedCategory;
  if (relevantPairs.length > 0) {
    // Use the category from the first relevant pair
    // Special handling: Gold/Silver pairs map to 'metals' category
    category = mapPairCategoryToNewsCategory(relevantPairs[0].category, relevantPairs[0].pair);
  }
  
  // Score urgency
  const text = `${title} ${description || ''}`.toLowerCase();
  let urgency: 1 | 2 | 3 = 1;
  
  if (text.includes('breaking') || text.includes('just in') || text.includes('fed') || 
      text.includes('ecb') || text.includes('emergency') || text.includes('halt') ||
      text.includes('lawsuit') || text.includes('sec') || text.includes('hack') ||
      text.includes('exploit') || text.includes('war')) {
    urgency = 3;
  } else if ((source.includes('Reuters') || source.includes('CNBC')) && ageMinutes < 5) {
    urgency = 3;
  } else if (text.includes('earnings') || text.includes('regulation') || text.includes('markets') ||
             text.includes('movement') || text.includes('product launch') || text.includes('m&a') ||
             text.includes('merger') || text.includes('acquisition') || text.includes('ipo')) {
    urgency = 2;
  }
  
  // Extract tags
  const tags: string[] = [];
  if (text.includes('fed') || text.includes('powell') || text.includes('interest rates')) tags.push('fed');
  if (text.includes('stocks') || text.includes('nasdaq') || text.includes('dow') || text.includes('s&p')) tags.push('markets');
  if (text.includes('bitcoin') || text.includes('ethereum') || text.includes('btc') || text.includes('eth') || text.includes('crypto')) tags.push('crypto');
  if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('openai')) tags.push('ai');
  if (text.includes('hack') || text.includes('exploit') || text.includes('breach')) tags.push('security');
  if (text.includes('law') || text.includes('regulation') || text.includes('approval') || text.includes('ban')) tags.push('regulation');
  if (text.includes('gold') || text.includes('xau') || text.includes('precious metal')) tags.push('gold');
  if (text.includes('silver') || text.includes('xag')) tags.push('silver');
  
  // Add trading pair symbols as tags
  relevantPairSymbols.forEach(pair => tags.push(pair.split('/')[0].toLowerCase()));
  
  return {
    id,
    headline: title,
    brief: description,
    source,
    url,
    publishedAt: pubDate.toISOString(),
    category,
    urgency,
    tags,
    relevantPairs: relevantPairSymbols,
    imageUrl: item.imageUrl || null,
  };
}

// Deduplicate items
function deduplicateItems(items: NormalizedNewsItem[]): NormalizedNewsItem[] {
  const seen = new Set<string>();
  const urlSet = new Set<string>();
  const result: NormalizedNewsItem[] = [];
  
  for (const item of items) {
    // Skip if URL already seen
    if (urlSet.has(item.url)) continue;
    
    // Skip if ID already seen
    if (seen.has(item.id)) continue;
    
    seen.add(item.id);
    urlSet.add(item.url);
    result.push(item);
  }
  
  return result;
}

// Fetch a single RSS feed
async function fetchFeed(feed: typeof RSS_FEEDS[0], maxAgeMinutes: number = 24 * 60): Promise<NormalizedNewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const xmlText = await response.text();
    const items = parseRSSFeed(xmlText);
    
    return items
      .map(item => normalizeItem(item, feed.name, feed.category, maxAgeMinutes))
      .filter((item): item is NormalizedNewsItem => item !== null);
  } catch (error) {
    console.error(`Error fetching ${feed.name}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Cleanup stale cache entries (runs on each request)
    cleanupCache();
    
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const maxAgeMinutes = parseInt(searchParams.get('maxAgeMinutes') || String(24 * 60)); // Default 24 hours
    
    // Check cache first
    const cacheKey = getCacheKey(maxAgeMinutes, category);
    const cached = newsCache.get(cacheKey);
    
    if (cached && isCacheValid(cached, maxAgeMinutes)) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      console.log(`[RSS API] ✅ Serving from global cache (age: ${cacheAge}s, key: ${cacheKey})`);
      
      // Apply limit to cached items
      const limitedItems = cached.items.slice(0, limit);
      
    // Calculate when cache expires
    const ttl = maxAgeMinutes <= 15 ? CACHE_TTL_15MIN : CACHE_TTL_24HR;
    const cacheExpiresAt = cached.timestamp + ttl;
    
    return NextResponse.json({
      success: true,
      items: limitedItems,
      count: limitedItems.length,
      timestamp: new Date(cached.timestamp).toISOString(),
      cacheExpiresAt: new Date(cacheExpiresAt).toISOString(),
      sources: RSS_FEEDS.map(f => f.name),
      totalFeeds: RSS_FEEDS.length,
      maxAgeMinutes,
      cached: true,
      cacheAgeSeconds: cacheAge,
    }, {
        headers: {
          'Cache-Control': maxAgeMinutes <= 15 
            ? 'public, s-maxage=900, stale-while-revalidate=60' // 15 min cache, 1 min stale
            : 'public, s-maxage=300, stale-while-revalidate=120', // 5 min cache, 2 min stale
        },
      });
    }
    
    // Cache miss or expired - fetch fresh news
    console.log(`[RSS API] 🔄 Cache miss/expired, fetching fresh news from ${RSS_FEEDS.length} feeds (max age: ${maxAgeMinutes} minutes)...`);
    
    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => fetchFeed(feed, maxAgeMinutes));
    const feedResults = await Promise.all(feedPromises);
    
    // Log results per feed
    feedResults.forEach((items, index) => {
      console.log(`[RSS API] ${RSS_FEEDS[index].name}: ${items.length} items`);
    });
    
    // Flatten and deduplicate
    let allItems = feedResults.flat();
    console.log(`[RSS API] Total items before deduplication: ${allItems.length}`);
    allItems = deduplicateItems(allItems);
    console.log(`[RSS API] Total items after deduplication: ${allItems.length}`);
    
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
      allItems = allItems.filter(item => item.category === rssCategory);
    }
    
    // Sort by urgency and published date
    allItems.sort((a, b) => {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    // Store in cache (before limiting)
    const cacheTimestamp = Date.now();
    newsCache.set(cacheKey, {
      items: allItems,
      timestamp: cacheTimestamp,
      maxAgeMinutes,
    });
    
    // Limit results
    const limitedItems = allItems.slice(0, limit);
    
    // Calculate when cache expires
    const ttl = maxAgeMinutes <= 15 ? CACHE_TTL_15MIN : CACHE_TTL_24HR;
    const cacheExpiresAt = cacheTimestamp + ttl;
    
    console.log(`[RSS API] ✅ Fetched and cached ${limitedItems.length} items (limit: ${limit}, maxAge: ${maxAgeMinutes}min, totalFeeds: ${RSS_FEEDS.length})`);
    
    return NextResponse.json({
      success: true,
      items: limitedItems,
      count: limitedItems.length,
      timestamp: new Date(cacheTimestamp).toISOString(),
      cacheExpiresAt: new Date(cacheExpiresAt).toISOString(),
      sources: RSS_FEEDS.map(f => f.name),
      totalFeeds: RSS_FEEDS.length,
      maxAgeMinutes,
      cached: false,
    }, {
      headers: {
        'Cache-Control': maxAgeMinutes <= 15 
          ? 'public, s-maxage=900, stale-while-revalidate=60' // 15 min cache, 1 min stale
          : 'public, s-maxage=300, stale-while-revalidate=120', // 5 min cache, 2 min stale
      },
    });
  } catch (error) {
    console.error('Error in RSS news API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export route segment config for Next.js caching
export const revalidate = 900; // Revalidate every 15 minutes (in seconds)
