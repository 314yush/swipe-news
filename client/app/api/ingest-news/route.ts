/**
 * Scheduled News Ingestion API Route
 * Triggered by Vercel Cron (every 3 minutes)
 * Checks market hours and adjusts frequency accordingly
 * - Market hours (Mon-Fri, 9:30 AM - 4:00 PM ET): Every 3 minutes
 * - Non-market hours: Every 15 minutes (skip if not needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsForIngestion } from '@/lib/services/apitubeIngestion';
import { normalizeArticles } from '@/lib/services/articleNormalizer';
import { deduplicateBatch, getDeduplicationStats } from '@/lib/services/deduplicator';
import { addArticles, getStorageStats } from '@/lib/services/articleStorage';

// Market hours checker (simplified version for ingestion)
function checkUSStockHours(): { isOpen: boolean; message: string } {
  // Get current time in ET timezone
  const etTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  const day = etTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min)
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  // Check if weekday (Mon-Fri)
  const isWeekday = day >= 1 && day <= 5;

  if (!isWeekday) {
    return {
      isOpen: false,
      message: 'US stock markets are closed on weekends',
    };
  }

  if (currentMinutes < marketOpen || currentMinutes >= marketClose) {
    return {
      isOpen: false,
      message: 'US stock markets are closed',
    };
  }

  return {
    isOpen: true,
    message: 'US stock markets are open',
  };
}

/**
 * Determine if we should run ingestion based on schedule
 * - Market hours: Every 3 minutes (always run)
 * - Non-market hours: Every 15 minutes (check if it's been 15+ minutes since last run)
 */
function shouldRunIngestion(): { shouldRun: boolean; reason: string } {
  const marketHours = checkUSStockHours();
  
  if (marketHours.isOpen) {
    // Market hours: Always run (cron is every 3 minutes)
    return { shouldRun: true, reason: 'Market hours - running every 3 minutes' };
  }
  
  // Non-market hours: Check if we should run (every 15 minutes)
  // Since Vercel cron runs every 3 minutes, we'll run every 5th call (3 * 5 = 15 minutes)
  // Use a simple modulo approach based on current minute
  const now = new Date();
  const minutes = now.getMinutes();
  
  // Run at minutes 0, 15, 30, 45 (every 15 minutes)
  if (minutes % 15 === 0) {
    return { shouldRun: true, reason: 'Non-market hours - running every 15 minutes' };
  }
  
  return { shouldRun: false, reason: 'Non-market hours - skipping (not 15-minute interval)' };
}

export async function GET(request: NextRequest) {
  try {
    // Check if API key is set
    if (!process.env.APITUBE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'APITUBE_API_KEY not set' },
        { status: 500 }
      );
    }

    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In production, you might want to verify the cron secret
      // For now, we'll allow it but log a warning
      console.warn('[Ingestion] Cron request without proper auth header');
    }

    // Check if we should run ingestion
    const { shouldRun, reason } = shouldRunIngestion();
    
    if (!shouldRun) {
      console.log(`[Ingestion] Skipping ingestion: ${reason}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Ingestion] Starting news ingestion: ${reason}`);

    // Fetch news from APITube (last 60 minutes)
    const rawArticles = await fetchNewsForIngestion({
      timeWindowMinutes: 60,
      maxPerPage: 100,
    });

    if (rawArticles.length === 0) {
      console.log('[Ingestion] No articles fetched from APITube');
      return NextResponse.json({
        success: true,
        fetched: 0,
        normalized: 0,
        duplicates: 0,
        added: 0,
        stats: getStorageStats(),
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize articles
    const normalizedArticles = normalizeArticles(rawArticles);
    console.log(`[Ingestion] Normalized ${normalizedArticles.length} articles`);

    // Deduplicate within batch
    const deduplicatedArticles = deduplicateBatch(normalizedArticles);
    const batchDedupStats = getDeduplicationStats(
      normalizedArticles.length,
      deduplicatedArticles.length
    );

    // Add to storage (will deduplicate against existing)
    const { added, duplicates, total } = addArticles(deduplicatedArticles);

    // Get final storage stats
    const stats = getStorageStats();

    console.log(`[Ingestion] ✅ Completed:`, {
      fetched: rawArticles.length,
      normalized: normalizedArticles.length,
      batchDuplicates: batchDedupStats.duplicates,
      storageDuplicates: duplicates,
      added,
      total,
    });

    return NextResponse.json({
      success: true,
      fetched: rawArticles.length,
      normalized: normalizedArticles.length,
      batchDuplicates: batchDedupStats.duplicates,
      storageDuplicates: duplicates,
      added,
      total,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Ingestion] Error:', error);
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

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}

