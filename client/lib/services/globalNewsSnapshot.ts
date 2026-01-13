/**
 * Global News Snapshot Service
 * Manages a single global news snapshot stored in Supabase
 * All users see the same news from this snapshot
 */

import { getSupabaseService } from './supabase';
import { type NormalizedArticle } from './articleNormalizer';

const SNAPSHOT_KEY = 'global_news_snapshot';

interface SnapshotRecord {
  id: string;
  snapshot_key: string;
  bucket: string;
  articles: NormalizedArticle[];
  created_at: string;
  updated_at: string;
}

/**
 * Get current global news snapshot
 */
let inMemorySnapshot: {
  bucket: string | null;
  articles: NormalizedArticle[];
} | null = null;

export async function getGlobalSnapshot(): Promise<{
  bucket: string | null;
  articles: NormalizedArticle[];
} | null> {
  const supabase = getSupabaseService();
  if (!supabase) {
    console.warn('[Global Snapshot] Supabase not configured, using in-memory fallback');
    return inMemorySnapshot;
  }

  try {
    const { data, error } = await supabase
      .from('news_snapshots')
      .select('*')
      .eq('snapshot_key', SNAPSHOT_KEY)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[Global Snapshot] Error fetching snapshot:', error);
      return null;
    }

    if (!data) {
      return { bucket: null, articles: [] };
    }

    return {
      bucket: data.bucket,
      articles: data.articles || [],
    };
  } catch (error) {
    console.error('[Global Snapshot] Unexpected error:', error);
    return null;
  }
}

/**
 * Store global news snapshot
 */
export async function storeGlobalSnapshot(
  bucket: string,
  articles: NormalizedArticle[]
): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) {
    console.warn('[Global Snapshot] Supabase not configured, storing in-memory fallback');
    inMemorySnapshot = { bucket, articles };
    return true;
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('news_snapshots')
      .upsert(
        {
          snapshot_key: SNAPSHOT_KEY,
          bucket,
          articles,
          updated_at: now,
        },
        {
          onConflict: 'snapshot_key',
        }
      );

    if (error) {
      console.error('[Global Snapshot] Error storing snapshot:', error);
      return false;
    }

    console.log(`[Global Snapshot] Stored ${articles.length} articles for bucket ${bucket}`);
    return true;
  } catch (error) {
    console.error('[Global Snapshot] Unexpected error:', error);
    return false;
  }
}

/**
 * Get snapshot metadata (bucket and timestamp)
 */
export async function getSnapshotMetadata(): Promise<{
  bucket: string | null;
  updatedAt: string | null;
} | null> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('news_snapshots')
      .select('bucket, updated_at')
      .eq('snapshot_key', SNAPSHOT_KEY)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[Global Snapshot] Error fetching metadata:', error);
      return null;
    }

    if (!data) {
      return { bucket: null, updatedAt: null };
    }

    return {
      bucket: data.bucket,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('[Global Snapshot] Unexpected error:', error);
    return null;
  }
}

