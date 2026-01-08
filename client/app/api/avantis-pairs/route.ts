/**
 * Next.js API Route - Avantis Pairs Proxy
 * 
 * Proxies requests to Avantis Socket API to bypass CORS restrictions.
 * This route runs on the server, so it doesn't have CORS limitations.
 */

import { NextRequest, NextResponse } from 'next/server';

const AVANTIS_API_URL = 'https://socket-api-pub.avantisfi.com/socket-api/v1/data';

export async function GET(request: NextRequest) {
  try {
    console.log('[AVANTIS_PROXY] Fetching pairs data from Avantis API...');
    
    const response = await fetch(AVANTIS_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SwipeTrader/1.0',
      },
      // Add cache control to reduce API calls
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    if (!response.ok) {
      console.error(`[AVANTIS_PROXY] API returned ${response.status}: ${response.statusText}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Avantis API returned ${response.status}: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log(`[AVANTIS_PROXY] ✅ Successfully fetched ${data.data?.pairCount || 0} pairs`);
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[AVANTIS_PROXY] ❌ Error fetching pairs data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch Avantis pairs data',
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}






