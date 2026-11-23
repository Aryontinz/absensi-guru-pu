import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isBrowserSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient: SupabaseClient | null = isBrowserSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
