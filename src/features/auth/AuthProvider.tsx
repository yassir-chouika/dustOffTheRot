import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { demoMode, supabase } from '../../lib/supabase';
import { AuthContext } from './state';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(!!supabase);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [membership, setMembership] = useState<{
    userId: string;
    profile: Profile | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(data.session);
          setInitializing(false);
          setAuthError(error ? 'Your session could not be restored. Please sign in again.' : null);
        }
      })
      .catch(() => {
        if (active) {
          setInitializing(false);
          setAuthError('Could not reach sign-in. Check your connection and try again.');
        }
      });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setInitializing(false);
      setAuthError(null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        setRecovery(false);
        setMembership(null);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [attempt]);
  const user = session?.user ?? null;
  useEffect(() => {
    if (!user || !supabase) return;
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (active)
            setMembership({
              userId: user.id,
              profile: data,
              error: error ? 'Your invitation could not be checked. Please try again.' : null,
            });
        },
        () => {
          if (active)
            setMembership({
              userId: user.id,
              profile: null,
              error: 'Could not reach your reading room. Please try again.',
            });
        },
      );
    return () => {
      active = false;
    };
  }, [user, attempt]);
  return (
    <AuthContext.Provider
      value={{
        user,
        profile: membership?.userId === user?.id ? (membership?.profile ?? null) : null,
        loading: !demoMode && (initializing || (!!user && membership?.userId !== user.id)),
        error: authError ?? (membership?.userId === user?.id ? (membership?.error ?? null) : null),
        demo: demoMode,
        recovery,
        finishRecovery: () => setRecovery(false),
        retry: () => setAttempt((n) => n + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
