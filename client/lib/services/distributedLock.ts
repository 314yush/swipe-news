/**
 * Distributed Lock Service
 * Uses Supabase to implement a distributed lock for preventing duplicate refreshes
 */

import { getSupabaseService } from './supabase';

const LOCK_NAME = 'global_news_refresh';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface LockRecord {
  id: string;
  lock_name: string;
  locked_at: string;
  locked_by: string;
  expires_at: string;
}

/**
 * Acquire a distributed lock
 * Returns true if lock was acquired, false if already locked
 */
export async function acquireLock(instanceId: string = 'default'): Promise<boolean> {
  const supabase = getSupabaseService();
  if (!supabase) {
    console.warn('[Distributed Lock] Supabase not configured, proceeding without lock (single instance mode)');
    return true;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from('refresh_locks')
      .select('*')
      .eq('lock_name', LOCK_NAME)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[Distributed Lock] Error checking lock:', error);
      return false;
    }

    if (data) {
      const expiresAtDate = new Date(data.expires_at);
      const nowDate = new Date();

      if (expiresAtDate > nowDate) {
        console.log(`[Distributed Lock] Lock already held by ${data.locked_by} until ${expiresAtDate.toISOString()}`);
        return false;
      } else {
        console.log(`[Distributed Lock] Lock expired, releasing and acquiring new lock`);
        await supabase
          .from('refresh_locks')
          .delete()
          .eq('lock_name', LOCK_NAME);
      }
    }

    const { error: insertError } = await supabase
      .from('refresh_locks')
      .insert({
        lock_name: LOCK_NAME,
        locked_by: instanceId,
        locked_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[Distributed Lock] Error acquiring lock:', insertError);
      return false;
    }

    console.log(`[Distributed Lock] Lock acquired by ${instanceId}`);
    return true;
  } catch (error) {
    console.error('[Distributed Lock] Unexpected error:', error);
    return false;
  }
}

/**
 * Release the distributed lock
 */
export async function releaseLock(): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('refresh_locks')
      .delete()
      .eq('lock_name', LOCK_NAME);

    if (error) {
      console.error('[Distributed Lock] Error releasing lock:', error);
    } else {
      console.log('[Distributed Lock] Lock released');
    }
  } catch (error) {
    console.error('[Distributed Lock] Unexpected error releasing lock:', error);
  }
}

/**
 * Cleanup expired locks (should be called periodically)
 */
export async function cleanupExpiredLocks(): Promise<void> {
  const supabase = getSupabaseService();
  if (!supabase) {
    return;
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('refresh_locks')
      .delete()
      .lt('expires_at', now);

    if (error) {
      console.error('[Distributed Lock] Error cleaning up locks:', error);
    }
  } catch (error) {
    console.error('[Distributed Lock] Unexpected error cleaning up locks:', error);
  }
}

