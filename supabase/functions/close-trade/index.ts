import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use host.docker.internal to access host machine from Docker container
// On macOS/Windows, this allows the container to reach services on localhost
const TRADING_SERVICE_URL = Deno.env.get('TRADING_SERVICE_URL') || 'http://host.docker.internal:8000';

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const { trade_id, user_id } = await req.json();

    if (!trade_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with secret key
    // Note: Supabase CLI provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically when linked
    // For custom cloud URL, use CLOUD_SUPABASE_URL and CLOUD_SUPABASE_KEY
    const supabaseUrl = Deno.env.get('CLOUD_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('CLOUD_SUPABASE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trade and validate ownership
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*, users!inner(privy_user_id, privy_wallet_address, wallet_address)')
      .eq('id', trade_id)
      .eq('user_id', user_id)
      .eq('status', 'open') // Using 'open' to match your schema
      .single();

    if (tradeError || !trade) {
      return new Response(
        JSON.stringify({ success: false, message: 'Trade not found or already closed' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate that we have pair_index and trade_index
    if (trade.pair_index === null || trade.trade_index === null) {
      return new Response(
        JSON.stringify({ success: false, message: 'Trade missing position identifiers' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Privy info
    const user = trade.users;
    const walletAddress = user.privy_wallet_address || user.wallet_address;
    const privyUserId = user.privy_user_id || user.privy_id;

    if (!walletAddress || !privyUserId) {
      return new Response(
        JSON.stringify({ success: false, message: 'User wallet not configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Python trading service
    const closeResponse = await fetch(`${TRADING_SERVICE_URL}/close-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privy_user_id: privyUserId,
        wallet_address: walletAddress,
        pair_index: trade.pair_index,
        trade_index: trade.trade_index,
      }),
    });

    if (!closeResponse.ok) {
      const error = await closeResponse.json();
      return new Response(
        JSON.stringify({ success: false, message: error.detail || 'Failed to close position' }),
        { status: closeResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const closeResult = await closeResponse.json();

    // Update trade status
    // Note: In production, fetch current price to calculate P&L
    const { error: updateError } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        // exit_price and pnl should be calculated from current price
        // For now, we'll leave them as null and calculate later if needed
        // Note: Your schema uses exit_price, pnl, pnl_percent which we'll set to null for now
      })
      .eq('id', trade_id);

    if (updateError) {
      console.error('Error updating trade:', updateError);
      // Position closed but failed to update - still return success
    }

    return new Response(
      JSON.stringify({
        success: true,
        tx_hash: closeResult.tx_hash,
        exit_price: null, // Should be fetched from market
        pnl: null, // Should be calculated
        message: 'Position closed successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in close-trade:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

