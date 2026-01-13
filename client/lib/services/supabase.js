import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client instance
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a placeholder client if env vars are not set (for development with mock data)
let supabase = null;
let supabaseService = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} else {
  console.warn(
    'Supabase environment variables not set. Running with mock data only.'
  );
}

// Service role client for server-side operations (bypasses RLS)
if (supabaseUrl && supabaseServiceKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

/**
 * Get the Supabase client (publishable key, respects RLS)
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const getSupabase = () => {
  return supabase;
};

/**
 * Get the Supabase service role client (bypasses RLS, for server-side operations)
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const getSupabaseService = () => {
  return supabaseService || supabase; // Fallback to regular client if service key not available
};

/**
 * Fetch news from Supabase
 * @param {Object} options
 * @param {string} options.category - Category filter
 * @param {number} options.limit - Number of items to fetch
 * @param {number} options.offset - Offset for pagination
 */
export async function fetchNewsFromSupabase({ category, limit = 20, offset = 0 } = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  let query = supabase
    .from('news_cache')
    .select('*')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'Trending') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Save user to Supabase
 * @param {Object} user - User object from Privy
 */
export async function saveUser(user) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping user save');
    return null;
  }

  // Get wallet address from user object or wallets
  // The user object structure may vary, so we try multiple approaches
  let walletAddress = null;
  if (user.wallet?.address) {
    walletAddress = user.wallet.address;
  } else if (user.linkedAccounts) {
    // Try to find wallet from linked accounts
    const walletAccount = user.linkedAccounts.find(acc => acc.type === 'wallet');
    if (walletAccount?.address) {
      walletAddress = walletAccount.address;
    }
  }

  // Prepare insert/update data
  // Both privy_id and privy_user_id should be set to the same value
  // The database trigger will ensure they stay in sync
  const userData = {
    privy_id: user.id,
    privy_user_id: user.id, // Same value - trigger will keep them in sync
    wallet_address: walletAddress,
    privy_wallet_address: walletAddress,
    updated_at: new Date().toISOString(),
  };
  
  // Only include email if it exists and the column exists in the schema
  // Email is optional and may not be present for all users
  const emailValue = user.email?.address || user.email;
  if (emailValue) {
    userData.email = emailValue;
  }

  // Use upsert with privy_user_id as the conflict resolution column
  // This is the preferred column since it has a unique constraint (after migration 010)
  // and is what the trading service uses
  const { data, error } = await supabase
    .from('users')
    .upsert(userData, {
      onConflict: 'privy_user_id',
    })
    .select()
    .single();

  if (error) {
    // If privy_user_id doesn't work (migration 010 not run yet), try privy_id
    if (error.code === 'PGRST204' || error.message?.includes('privy_user_id')) {
      console.warn('privy_user_id unique constraint not found, trying privy_id:', error);
      
      // Fallback to privy_id (which has UNIQUE constraint from migration 001)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'privy_id',
        })
        .select()
        .single();

      if (fallbackError) {
        console.error('Error saving user (both methods failed):', fallbackError);
        throw fallbackError;
      }

      return fallbackData;
    }

    console.error('Error saving user:', error);
    throw error;
  }

  return data;
}

/**
 * Get user ID from Supabase by Privy ID
 * @param {string} privyId - Privy user ID
 * @returns {Promise<string|null>} Supabase user ID or null
 */
export async function getUserIdByPrivyId(privyId) {
  if (!supabase || !privyId) {
    return null;
  }

  try {
    // Try privy_user_id first (preferred after migration 010)
    let { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyId)
      .maybeSingle();

    // If not found, try privy_id (fallback for older schema)
    if (error || !data) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('id')
        .eq('privy_id', privyId)
        .maybeSingle();

      if (fallbackError || !fallbackData) {
        return null;
      }

      return fallbackData.id;
    }

    return data.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Save news interaction to Supabase
 * @param {Object} interaction - Interaction object
 */
export async function saveNewsInteraction(interaction) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping interaction save');
    return null;
  }

  const { data, error } = await supabase
    .from('user_news_interactions')
    .upsert({
      user_id: interaction.userId,
      news_id: interaction.newsId,
      interaction_type: interaction.type, // 'dismissed', 'longed', 'shorted'
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving interaction:', error);
    throw error;
  }

  return data;
}

export default supabase;


