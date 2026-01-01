/**
 * Next.js API Route - Build Transaction
 * 
 * Proxies to Python trading service to build unsigned transactions
 * Replaces Supabase Edge Function for client-side Next.js deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/services/supabase';

// Python trading service URL (can be configured via env var)
const TRADING_SERVICE_URL = process.env.TRADING_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Content-Type': 'application/json',
    };

    const body = await request.json();
    const { user_id, market_pair, direction, collateral, leverage } = body;

    console.log('[build-transaction] Request received:', {
      user_id,
      market_pair,
      direction,
      collateral,
      leverage,
    });

    // Validate request
    if (!user_id || !market_pair || !direction || !collateral) {
      const missingFields = [];
      if (!user_id) missingFields.push('user_id');
      if (!market_pair) missingFields.push('market_pair');
      if (!direction) missingFields.push('direction');
      if (!collateral) missingFields.push('collateral');

      console.error('[build-transaction] Missing required fields:', missingFields);
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400, headers }
      );
    }

    // Get Supabase client
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message: 'Supabase not configured',
          error: 'Supabase client not available',
        },
        { status: 500, headers }
      );
    }

    // Get user's Privy info
    console.log('[build-transaction] Looking up user:', user_id);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, privy_user_id, privy_wallet_address, wallet_address, privy_id')
      .eq('id', user_id)
      .single();

    console.log('[build-transaction] User lookup result:', {
      found: !!user,
      error: userError?.message,
      user_data: user
        ? {
            id: user.id,
            has_privy_user_id: !!user.privy_user_id,
            has_wallet: !!(user.privy_wallet_address || user.wallet_address),
          }
        : null,
    });

    if (userError || !user) {
      console.error('[build-transaction] User lookup error:', {
        error: userError,
        user_id: user_id,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: userError?.message || 'User not found',
          user_id: user_id,
        },
        { status: 404, headers }
      );
    }

    // Use privy_wallet_address if available, fallback to wallet_address
    const walletAddress = user.privy_wallet_address || user.wallet_address;
    const privyUserId = user.privy_user_id || user.privy_id;

    if (!walletAddress || !privyUserId) {
      console.error('User wallet not configured:', {
        user_id,
        has_wallet_address: !!walletAddress,
        has_privy_user_id: !!privyUserId,
        user_data: user,
      });
      return NextResponse.json(
        {
          success: false,
          message: 'User wallet not configured',
          error: `Missing wallet: walletAddress=${!!walletAddress}, privyUserId=${!!privyUserId}`,
          user_id,
        },
        { status: 400, headers }
      );
    }

    // Call Python trading service to build transaction
    const finalLeverage = leverage || 75;
    console.log('[build-transaction] 📊 Trade parameters:', {
      market_pair,
      direction,
      collateral: `$${collateral}`,
      leverage: `${finalLeverage}x`,
      position_size: `$${collateral * finalLeverage}`,
    });

    console.log('[build-transaction] Calling Python service to build transaction...');
    const buildResponse = await fetch(`${TRADING_SERVICE_URL}/build-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privy_user_id: privyUserId,
        wallet_address: walletAddress,
        market_pair,
        direction,
        collateral,
        leverage: finalLeverage,
      }),
    });

    if (!buildResponse.ok) {
      let errorDetail = 'Failed to build transaction';
      try {
        const error = await buildResponse.json();
        errorDetail = error.detail || error.message || errorDetail;
        console.error('Python service error:', error);
      } catch (e) {
        errorDetail = `Python service returned ${buildResponse.status}: ${buildResponse.statusText}`;
        console.error('Failed to parse Python service error:', e);
      }

      return NextResponse.json(
        {
          success: false,
          message: errorDetail,
          error: errorDetail,
          trading_service_status: buildResponse.status,
        },
        { status: buildResponse.status, headers }
      );
    }

    const transactionData = await buildResponse.json();

    console.log('[build-transaction] ✅ Transaction built successfully:', {
      market_pair,
      direction,
      collateral: `$${collateral}`,
      leverage: `${finalLeverage}x`,
      position_size: `$${collateral * finalLeverage}`,
      pair_index: transactionData.pair_index,
      trade_index: transactionData.trade_index,
      entry_price: transactionData.entry_price,
      has_transaction: !!transactionData.transaction,
    });

    return NextResponse.json(
      {
        success: true,
        transaction: transactionData.transaction,
        pair_index: transactionData.pair_index,
        trade_index: transactionData.trade_index,
        entry_price: transactionData.entry_price,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in build-transaction:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: errorMessage,
        stack: errorStack,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    },
  });
}


