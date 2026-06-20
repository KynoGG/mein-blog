import { supabase, isDemoMode } from './supabase';

const PREFIX = 'kynogg-';

function getAllLocalData() {
  const payload = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        try { payload[key] = JSON.parse(localStorage.getItem(key)); } catch {}
      }
    }
  } catch {}
  return payload;
}

export async function syncFromCloud(userId) {
  console.log('[Sync] syncFromCloud called', { isDemoMode, hasSupabase: !!supabase, userId });
  if (isDemoMode || !supabase || !userId) {
    console.warn('[Sync] syncFromCloud aborted – isDemoMode:', isDemoMode, 'supabase:', !!supabase, 'userId:', userId);
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('user_sync')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('[Sync] syncFromCloud error:', error); return false; }
    if (!data?.payload) { console.log('[Sync] No cloud data found for user', userId); return false; }
    console.log('[Sync] Pulled from cloud, keys:', Object.keys(data.payload));
    for (const [key, value] of Object.entries(data.payload)) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
    return true;
  } catch (e) { console.error('[Sync] syncFromCloud exception:', e); return false; }
}

export async function syncToCloud(userId) {
  console.log('[Sync] syncToCloud called', { isDemoMode, hasSupabase: !!supabase, userId });
  if (isDemoMode || !supabase || !userId) {
    console.warn('[Sync] syncToCloud aborted – isDemoMode:', isDemoMode, 'supabase:', !!supabase, 'userId:', userId);
    return false;
  }
  try {
    const payload = getAllLocalData();
    console.log('[Sync] Pushing to cloud, keys:', Object.keys(payload));
    const { error } = await supabase
      .from('user_sync')
      .upsert(
        { user_id: userId, payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) { console.error('[Sync] syncToCloud error:', error); return false; }
    console.log('[Sync] Push successful');
    return true;
  } catch (e) { console.error('[Sync] syncToCloud exception:', e); return false; }
}
