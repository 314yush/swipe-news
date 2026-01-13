/**
 * News Refresh Service
 * Shared logic for refreshing news snapshot
 * Used by both /api/news and feed endpoints
 */

import { getCurrentRefreshBucket, hasBucketChanged } from './refreshBucket';
import { acquireLock, releaseLock } from './distributedLock';
import { getGlobalSnapshot, storeGlobalSnapshot } from './globalNewsSnapshot';
import { fetchNewsForIngestion } from './apitubeIngestion';
import { normalizeArticles } from './articleNormalizer';
import { deduplicateBatch } from './deduplicator';

/**
 * Refresh news snapshot if bucket changed
 * Returns the snapshot (existing or newly refreshed)
 */
export async function refreshNewsIfNeeded(): Promise<{
  bucket: string | null;
  articles: any[];
  wasRefreshed: boolean;
}> {
  const currentBucket = getCurrentRefreshBucket();
  const existingSnapshot = await getGlobalSnapshot();
  const existingBucket = existingSnapshot?.bucket || null;

  // Check if refresh is needed
  if (!hasBucketChanged(existingBucket) && existingSnapshot) {
    return {
      bucket: existingBucket,
      articles: existingSnapshot.articles,
      wasRefreshed: false,
    };
  }

  // Bucket changed - need to refresh
  console.log(`[News Refresh] Bucket changed (${existingBucket} → ${currentBucket}), refreshing...`);

  // Try to acquire lock
  const instanceId = `instance-${Date.now()}`;
  const lockAcquired = await acquireLock(instanceId);

  if (!lockAcquired) {
    // Lock not acquired - return existing snapshot
    console.log('[News Refresh] Lock not acquired, returning existing snapshot');
    const snapshot = await getGlobalSnapshot();
    return {
      bucket: snapshot?.bucket || null,
      articles: snapshot?.articles || [],
      wasRefreshed: false,
    };
  }

  try {
    // Lock acquired - proceed with refresh
    console.log('[News Refresh] Lock acquired, fetching from APITube...');

    if (!process.env.APITUBE_API_KEY) {
      throw new Error('APITUBE_API_KEY not set');
    }

    // Fetch news from APITube
    const rawArticles = await fetchNewsForIngestion({
      timeWindowMinutes: 60,
      maxPerPage: 100,
    });

    if (rawArticles.length === 0) {
      console.warn('[News Refresh] No articles fetched from APITube');
      await releaseLock();
      const snapshot = await getGlobalSnapshot();
      return {
        bucket: snapshot?.bucket || null,
        articles: snapshot?.articles || [],
        wasRefreshed: false,
      };
    }

    // Normalize and deduplicate
    const normalizedArticles = normalizeArticles(rawArticles);
    const deduplicatedArticles = deduplicateBatch(normalizedArticles);

    // Store snapshot
    await storeGlobalSnapshot(currentBucket, deduplicatedArticles);
    await releaseLock();

    console.log(`[News Refresh] ✅ Refresh complete: ${deduplicatedArticles.length} articles for bucket ${currentBucket}`);

    return {
      bucket: currentBucket,
      articles: deduplicatedArticles,
      wasRefreshed: true,
    };
  } catch (error) {
    await releaseLock();
    console.error('[News Refresh] Error during refresh:', error);

    // Return existing snapshot on error
    const snapshot = await getGlobalSnapshot();
    return {
      bucket: snapshot?.bucket || null,
      articles: snapshot?.articles || [],
      wasRefreshed: false,
    };
  }
}

