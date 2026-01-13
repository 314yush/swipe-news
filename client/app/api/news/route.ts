/**
 * Global News API Route
 * On-demand refresh based on time buckets (no cron needed!)
 * - Market hours: 3-minute buckets
 * - Off-hours: 15-minute buckets
 * Uses distributed locks to prevent duplicate refreshes
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshNewsIfNeeded } from '@/lib/services/newsRefresh';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.APITUBE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'APITUBE_API_KEY not set' },
        { status: 500 }
      );
    }

    // Refresh snapshot if needed
    const { bucket, articles, wasRefreshed } = await refreshNewsIfNeeded();

    return NextResponse.json({
      success: true,
      bucket,
      articles,
      count: articles.length,
      cached: !wasRefreshed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[News API] Unexpected error:', error);
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
