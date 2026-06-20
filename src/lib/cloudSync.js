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
  if (isDemoMode || !supabase || !userId) return false;
  try {
    const { data, error } = await supabase
      .from('user_sync')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.payload) return false;
    for (const [key, value] of Object.entries(data.payload)) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
    return true;
  } catch { return false; }
}

export async function syncToCloud(userId) {
  if (isDemoMode || !supabase || !userId) return false;
  try {
    const payload = getAllLocalData();
    const { error } = await supabase
      .from('user_sync')
      .upsert(
        { user_id: userId, payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    return !error;
  } catch { return false; }
}
