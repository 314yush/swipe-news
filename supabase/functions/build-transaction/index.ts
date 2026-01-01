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

    console.log('[build-transaction] Request received:', {
      method: req.method,
      url: req.url,
      trading_service_url: TRADING_SERVICE_URL,
    });

    const { user_id, market_pair, direction, collateral, leverage } = await req.json();
    
    console.log('[build-transaction] Request body:', {
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Initialize Supabase client with secret key
    const supabaseUrl = Deno.env.get('CLOUD_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('CLOUD_SUPABASE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('[build-transaction] Supabase config:', {
      supabase_url: supabaseUrl,
      has_secret_key: !!supabaseKey,
      user_id: user_id,
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      user_data: user ? { id: user.id, has_privy_user_id: !!user.privy_user_id, has_wallet: !!(user.privy_wallet_address || user.wallet_address) } : null,
    });

    if (userError || !user) {
      console.error('[build-transaction] User lookup error:', {
        error: userError,
        user_id: user_id,
        supabase_url: supabaseUrl,
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User not found',
          error: userError?.message || 'User not found',
          user_id: user_id,
        }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User wallet not configured',
          error: `Missing wallet: walletAddress=${!!walletAddress}, privyUserId=${!!privyUserId}`,
          user_id,
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
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
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: errorDetail,
          error: errorDetail,
          trading_service_status: buildResponse.status,
        }),
        { 
          status: buildResponse.status, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
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

    return new Response(
      JSON.stringify({
        success: true,
        transaction: transactionData.transaction,
        pair_index: transactionData.pair_index,
        trade_index: transactionData.trade_index,
        entry_price: transactionData.entry_price,
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
    console.error('Error in build-transaction:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
        error: errorMessage,
        stack: errorStack,
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});

