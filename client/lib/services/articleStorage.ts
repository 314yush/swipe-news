/**
 * In-Memory Article Storage
 * Manages 24-hour article retention with automatic cleanup
 * Append-only policy: Never modify existing articles
 */

import { type NormalizedArticle } from './articleNormalizer';
import { deduplicateAgainstExisting } from './deduplicator';

// In-memory storage
let articleStorage: NormalizedArticle[] = [];
let lastCleanupTime = Date.now();

const RETENTION_HOURS = 24;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Cleanup every hour
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;

/**
 * Clean up articles older than retention period
 */
function cleanupOldArticles(): void {
  const now = Date.now();
  const cutoffTime = now - RETENTION_MS;
  
  const beforeCount = articleStorage.length;
  articleStorage = articleStorage.filter(article => {
    const fetchedAt = new Date(article.fetched_at).getTime();
    return fetchedAt >= cutoffTime;
  });
  
  const removedCount = beforeCount - articleStorage.length;
  
  if (removedCount > 0) {
    console.log(`[Article Storage] Cleaned up ${removedCount} articles older than ${RETENTION_HOURS} hours`);
  }
  
  lastCleanupTime = now;
}

/**
 * Perform cleanup if needed
 */
function performCleanupIfNeeded(): void {
  const now = Date.now();
  if (now - lastCleanupTime >= CLEANUP_INTERVAL_MS) {
    cleanupOldArticles();
  }
}

/**
 * Add articles to storage (append-only)
 * Deduplicates against existing articles
 */
export function addArticles(articles: NormalizedArticle[]): {
  added: number;
  duplicates: number;
  total: number;
} {
  performCleanupIfNeeded();
  
  const beforeCount = articleStorage.length;
  
  // Deduplicate against existing articles
  const uniqueArticles = deduplicateAgainstExisting(articles, articleStorage);
  
  // Append new articles
  articleStorage.push(...uniqueArticles);
  
  const added = uniqueArticles.length;
  const duplicates = articles.length - added;
  const total = articleStorage.length;
  
  console.log(`[Article Storage] Added ${added} articles (${duplicates} duplicates skipped). Total: ${total}`);
  
  return { added, duplicates, total };
}

/**
 * Get all articles (within retention period)
 */
export function getAllArticles(): NormalizedArticle[] {
  performCleanupIfNeeded();
  return [...articleStorage]; // Return copy to prevent mutation
}

/**
 * Get articles by freshness bucket
 */
export function getArticlesByBucket(bucket: 'hot' | 'recent' | 'older'): NormalizedArticle[] {
  performCleanupIfNeeded();
  return articleStorage.filter(article => article.freshness_bucket === bucket);
}

/**
 * Get articles within time window (in minutes from now)
 */
export function getArticlesInWindow(windowMinutes: number): NormalizedArticle[] {
  performCleanupIfNeeded();
  const cutoffTime = Date.now() - (windowMinutes * 60 * 1000);
  
  return articleStorage.filter(article => {
    const publishedAt = new Date(article.published_at).getTime();
    return publishedAt >= cutoffTime;
  });
}

/**
 * Get article by hash
 */
export function getArticleByHash(hash: string): NormalizedArticle | undefined {
  performCleanupIfNeeded();
  return articleStorage.find(article => article.hash === hash);
}

/**
 * Get article by ID
 */
export function getArticleById(id: string): NormalizedArticle | undefined {
  performCleanupIfNeeded();
  return articleStorage.find(article => article.id === id);
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  total: number;
  hot: number;
  recent: number;
  older: number;
  oldestAgeMinutes: number;
  newestAgeMinutes: number;
} {
  performCleanupIfNeeded();
  
  const hot = articleStorage.filter(a => a.freshness_bucket === 'hot').length;
  const recent = articleStorage.filter(a => a.freshness_bucket === 'recent').length;
  const older = articleStorage.filter(a => a.freshness_bucket === 'older').length;
  
  let oldestAgeMinutes = 0;
  let newestAgeMinutes = Infinity;
  
  if (articleStorage.length > 0) {
    const ages = articleStorage.map(a => a.age_minutes);
    oldestAgeMinutes = Math.max(...ages);
    newestAgeMinutes = Math.min(...ages);
  }
  
  return {
    total: articleStorage.length,
    hot,
    recent,
    older,
    oldestAgeMinutes,
    newestAgeMinutes: newestAgeMinutes === Infinity ? 0 : newestAgeMinutes,
  };
}

/**
 * Clear all articles (for testing/reset)
 */
export function clearStorage(): void {
  articleStorage = [];
  lastCleanupTime = Date.now();
  console.log('[Article Storage] Storage cleared');
}

/**
 * Force cleanup (for testing)
 */
export function forceCleanup(): number {
  const beforeCount = articleStorage.length;
  cleanupOldArticles();
  return beforeCount - articleStorage.length;
}

