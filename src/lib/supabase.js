import { createClient } from '@supabase/supabase-js';
import { mockAuth } from './mockAuth';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isDemoMode = !url || url.includes('dein-projekt');

const client = isDemoMode ? null : createClient(url, key);

export const supabase = client;
export const auth = isDemoMode ? mockAuth : client.auth;
