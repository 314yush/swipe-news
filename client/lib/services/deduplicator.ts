/**
 * Deduplication Module
 * Implements global hash-based deduplication
 * Keeps earliest fetched article when duplicates exist
 * Prefers higher-trust sources
 */

import { type NormalizedArticle } from './articleNormalizer';

/**
 * Source trust ranking (higher number = more trusted)
 * Can be expanded with more sources
 */
const SOURCE_TRUST_RANKING: Record<string, number> = {
  'reuters.com': 100,
  'bloomberg.com': 100,
  'wsj.com': 100,
  'ft.com': 95,
  'cnbc.com': 90,
  'bbc.com': 90,
  'theguardian.com': 85,
  'coindesk.com': 80,
  'cointelegraph.com': 80,
  'decrypt.co': 75,
  'theblock.co': 75,
};

/**
 * Get source trust score
 * Returns 50 as default for unknown sources
 */
function getSourceTrustScore(source: string): number {
  const domain = source.toLowerCase();
  return SOURCE_TRUST_RANKING[domain] || 50;
}

/**
 * Deduplicate articles within a batch
 * - Uses hash for deduplication
 * - Keeps earliest fetched_at article
 * - Prefers higher-trust sources when fetched_at is equal
 */
export function deduplicateBatch(articles: NormalizedArticle[]): NormalizedArticle[] {
  const hashMap = new Map<string, NormalizedArticle>();
  
  for (const article of articles) {
    const existing = hashMap.get(article.hash);
    
    if (!existing) {
      // First occurrence of this hash
      hashMap.set(article.hash, article);
    } else {
      // Duplicate found - decide which to keep
      const existingFetchedAt = new Date(existing.fetched_at).getTime();
      const currentFetchedAt = new Date(article.fetched_at).getTime();
      
      // Keep earliest fetched article
      if (currentFetchedAt < existingFetchedAt) {
        hashMap.set(article.hash, article);
      } else if (currentFetchedAt === existingFetchedAt) {
        // Same fetch time - prefer higher-trust source
        const existingTrust = getSourceTrustScore(existing.source);
        const currentTrust = getSourceTrustScore(article.source);
        
        if (currentTrust > existingTrust) {
          hashMap.set(article.hash, article);
        }
        // Otherwise keep existing
      }
      // Otherwise keep existing (earlier fetched_at)
    }
  }
  
  return Array.from(hashMap.values());
}

/**
 * Deduplicate against existing articles
 * Used when adding new articles to storage
 */
export function deduplicateAgainstExisting(
  newArticles: NormalizedArticle[],
  existingArticles: NormalizedArticle[]
): NormalizedArticle[] {
  // Create a set of existing hashes for fast lookup
  const existingHashes = new Set(existingArticles.map(a => a.hash));
  
  // Filter out articles that already exist
  const uniqueNewArticles = newArticles.filter(article => !existingHashes.has(article.hash));
  
  // Deduplicate within the new batch
  return deduplicateBatch(uniqueNewArticles);
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats(
  originalCount: number,
  deduplicatedCount: number
): { duplicates: number; duplicateRate: number } {
  const duplicates = originalCount - deduplicatedCount;
  const duplicateRate = originalCount > 0 ? (duplicates / originalCount) * 100 : 0;
  
  return {
    duplicates,
    duplicateRate: Math.round(duplicateRate * 100) / 100, // Round to 2 decimal places
  };
}

