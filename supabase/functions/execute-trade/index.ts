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

    console.log('[execute-trade] Request received:', {
      method: req.method,
      url: req.url,
      trading_service_url: TRADING_SERVICE_URL,
    });

    const { user_id, news_id, market_pair, direction, collateral, leverage, signed_transaction, tx_hash, pair_index, trade_index, entry_price } = await req.json();
    
    console.log('[execute-trade] Request body:', {
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
      
      console.error('[execute-trade] Missing required fields:', missingFields);
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
    // Note: Supabase CLI provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically when linked
    // For custom cloud URL, use CLOUD_SUPABASE_URL and CLOUD_SUPABASE_KEY
    const supabaseUrl = Deno.env.get('CLOUD_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('CLOUD_SUPABASE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('[execute-trade] Supabase config:', {
      supabase_url: supabaseUrl,
      has_secret_key: !!supabaseKey,
      user_id: user_id,
    });
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Privy info
    console.log('[execute-trade] Looking up user:', user_id);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, privy_user_id, privy_wallet_address, wallet_address, privy_id')
      .eq('id', user_id)
      .single();

    console.log('[execute-trade] User lookup result:', {
      found: !!user,
      error: userError?.message,
      user_data: user ? { id: user.id, has_privy_user_id: !!user.privy_user_id, has_wallet: !!(user.privy_wallet_address || user.wallet_address) } : null,
    });

    if (userError || !user) {
      console.error('[execute-trade] User lookup error:', {
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
          debug: {
            supabase_url: supabaseUrl,
            hint: 'Make sure the user exists in the database. If using local Supabase, ensure the user is saved to local database. If using cloud Supabase, link the project with: supabase link --project-ref YOUR_PROJECT_REF',
          },
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

    // If tx_hash is provided (external wallet already sent transaction), just save to database
    if (tx_hash) {
      console.log('[execute-trade] External wallet transaction already sent, saving to database...');
      
      // Validate news_id - must be a valid UUID or null
      // Mock news uses string IDs like "news-1" which aren't valid UUIDs
      const isValidUUID = (str: string | null | undefined): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };
      const validNewsId = news_id && isValidUUID(news_id) ? news_id : null;

      // Prepare trade data for database insert (external wallet path)
      // Note: Using 'market_pair' as that's what the actual database column is
      // 'category' and 'position_size' are required (NOT NULL), so we must include them
      const externalTradeData: any = {
        user_id,
        news_id: validNewsId, // Use validated news_id (null if not a valid UUID)
        market_pair, // Using market_pair as that's what the database expects
        category: getCategoryFromPair(market_pair), // Required NOT NULL field
        direction,
        collateral,
        leverage: leverage || 75,
        position_size: collateral * (leverage || 75), // Required NOT NULL field
        entry_price: entry_price || 0,
        pair_index: pair_index || 0,
        trade_index: trade_index || 0,
        avantis_trade_id: tx_hash,
        privy_user_id: privyUserId,
        privy_wallet_address: walletAddress,
        status: 'active', // Schema uses 'active' not 'open'
        // take_profit omitted - optional field, PostgREST can't find it
      };

      // Store trade in database with the transaction hash
      const { data: trade, error: tradeError } = await supabase
        .from('trades')
        .insert(externalTradeData)
        .select()
        .single();

      if (tradeError) {
        console.error('Error storing trade:', tradeError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to save trade to database',
            error: tradeError.message,
            context: {
              code: tradeError.code,
              details: tradeError.details,
              hint: tradeError.hint,
            },
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

      return new Response(
        JSON.stringify({
          success: true,
          trade_id: trade?.id || null,
          avantis_trade_id: tx_hash,
          entry_price: entry_price || 0,
          pair_index: pair_index || 0,
          trade_index: trade_index || 0,
          tx_hash: tx_hash,
          message: 'Trade executed successfully (external wallet)',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Call Python trading service
    // If signed_transaction is provided, execute it directly
    // Otherwise, the service will build and sign server-side (legacy mode)
    const tradeResponse = await fetch(`${TRADING_SERVICE_URL}/execute-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privy_user_id: privyUserId,
        wallet_address: walletAddress,
        market_pair,
        direction,
        collateral,
        leverage: leverage || 75,
        ...(signed_transaction && { 
          signed_transaction,
          ...(pair_index !== undefined && { pair_index }),
          ...(trade_index !== undefined && { trade_index }),
          ...(entry_price !== undefined && { entry_price }),
        }),
      }),
    });

    if (!tradeResponse.ok) {
      let errorDetail = 'Trade execution failed';
      try {
        const error = await tradeResponse.json();
        errorDetail = error.detail || error.message || errorDetail;
        console.error('Python service error:', error);
      } catch (e) {
        errorDetail = `Python service returned ${tradeResponse.status}: ${tradeResponse.statusText}`;
        console.error('Failed to parse Python service error:', e);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: errorDetail,
          error: errorDetail,
          trading_service_status: tradeResponse.status,
        }),
        { 
          status: tradeResponse.status, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const tradeResult = await tradeResponse.json();

    // Validate news_id - must be a valid UUID or null
    // Mock news uses string IDs like "news-1" which aren't valid UUIDs
    const isValidUUID = (str: string | null | undefined): boolean => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    const validNewsId = news_id && isValidUUID(news_id) ? news_id : null;

    // Prepare trade data for database insert
    // Note: Using 'market_pair' as that's what the actual database column is
    // 'category' and 'position_size' are required (NOT NULL), so we must include them
    const tradeData: any = {
      user_id,
      news_id: validNewsId, // Use validated news_id (null if not a valid UUID)
      market_pair, // Using market_pair as that's what the database expects
      category: getCategoryFromPair(market_pair), // Required NOT NULL field
      direction,
      collateral,
      leverage: leverage || 75,
      position_size: collateral * (leverage || 75), // Required NOT NULL field
      entry_price: tradeResult.entry_price,
      pair_index: tradeResult.pair_index,
      trade_index: tradeResult.trade_index,
      avantis_trade_id: tradeResult.tx_hash,
      privy_user_id: privyUserId,
      privy_wallet_address: walletAddress,
      status: 'active', // Schema uses 'active' not 'open'
      // take_profit omitted - optional field, PostgREST can't find it
    };

    // Store trade in database
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single();

    if (tradeError) {
      console.error('Error storing trade:', tradeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to save trade to database',
          error: tradeError.message,
          context: {
            code: tradeError.code,
            details: tradeError.details,
            hint: tradeError.hint,
          },
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

    return new Response(
      JSON.stringify({
        success: true,
        trade_id: trade?.id || null,
        avantis_trade_id: tradeResult.tx_hash,
        entry_price: tradeResult.entry_price,
        pair_index: tradeResult.pair_index,
        trade_index: tradeResult.trade_index,
        tx_hash: tradeResult.tx_hash,
        message: 'Trade executed successfully',
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
    console.error('Error in execute-trade:', error);
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

function getCategoryFromPair(pair: string): string {
  // Simple categorization - can be improved
  if (pair.includes('/USD') && !pair.startsWith('USD/')) {
    if (['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'BNB', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'XLM', 'NEAR', 'APE', 'ARB', 'OP', 'FTM', 'AAVE', 'CRV', 'MKR', 'SNX', 'COMP', 'SUSHI', 'YFI', 'PEPE', 'SHIB', 'WIF', 'BONK'].some(c => pair.includes(c))) {
      return 'CRYPTO';
    }
    return 'OTHER';
  }
  if (pair.startsWith('USD/')) {
    return 'FOREX';
  }
  if (['XAU', 'XAG', 'OIL', 'USOILSPOT', 'UKOILSPOT', 'XCU', 'XPT', 'XPD'].some(c => pair.includes(c))) {
    return 'COMMODITIES';
  }
  return 'OTHER';
}

