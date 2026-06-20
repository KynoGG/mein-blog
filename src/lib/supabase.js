import { createClient } from '@supabase/supabase-js';
import { mockAuth } from './mockAuth';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// isDemoMode controls whether the Supabase client is available for data sync.
// Auth always uses mockAuth so existing accounts (Tim/Livora2025) keep working.
export const isDemoMode = !url || url.includes('dein-projekt');

export const supabase = isDemoMode ? null : createClient(url, key);

// Always use mockAuth — accounts live in localStorage, not Supabase Auth
export const auth = mockAuth;
