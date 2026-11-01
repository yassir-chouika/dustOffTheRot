import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

export interface AuthState {
  user: User | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  recovery: boolean;
  finishRecovery: () => void;
  retry: () => void;
}
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error('AuthProvider is required');
  return state;
}
