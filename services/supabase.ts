import { createClient } from '@supabase/supabase-js';
import { API_CONFIG } from '@/lib/constants';

if (!API_CONFIG.SUPABASE_URL || !API_CONFIG.SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(
  API_CONFIG.SUPABASE_URL || 'https://placeholder.supabase.co',
  API_CONFIG.SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export type SupabaseClient = typeof supabase;
