import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = !demoMode && url && key ? createClient<Database>(url, key) : null;
