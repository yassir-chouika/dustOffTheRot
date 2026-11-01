import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { AppContext } from './state';
import { catalogRepository, defaultPersonalBook, seedPersonal } from '../features/library/catalog';
import { readStored, writeStored } from '../lib/storage';
import type { Book, PersonalBook, Preferences } from '../types';
import { useAuth } from '../features/auth/state';
import { supabase } from '../lib/supabase';
import { cloudCatalogRepository } from '../features/library/cloudRepository';
import { preferenceSchema, loadPreferences } from '../features/settings/preferences';

const personalSchema = z.record(
  z.string(),
  z.object({
    status: z.enum(['want-to-read', 'reading', 'finished']),
    favorite: z.boolean(),
    percentage: z.number().min(0).max(100),
    lastReadAt: z.string().nullable(),
  }),
);
export function AppProvider({ children }: { children: ReactNode }) {
  const { user, demo } = useAuth();
  const userId = user?.id;
  const preferenceKey = demo ? 'folio.preferences.v1' : `folio.preferences.v1.${userId}`;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(preferenceKey));
  const [personal, setPersonal] = useState<Record<string, PersonalBook>>(() =>
    demo
      ? readStored(
          'folio.demo.shelves.v1',
          seedPersonal,
          (v): v is Record<string, PersonalBook> => personalSchema.safeParse(v).success,
        )
      : {},
  );
  const [storageError, setStorageError] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const preferenceRef = useRef(preferences);
  const personalRef = useRef(personal);
  const preferenceVersion = useRef(0);
  const pendingPreferences = useRef<Preferences | null>(null);
  const preferenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preferenceQueue = useRef<Promise<void>>(Promise.resolve());
  const shelfQueue = useRef<Promise<void>>(Promise.resolve());
  const readingSavers = useRef(new Set<() => Promise<void>>());
  useLayoutEffect(() => {
    preferenceRef.current = preferences;
    personalRef.current = personal;
  }, [preferences, personal]);

  const flushPreferences = useCallback(() => {
    if (preferenceTimer.current) clearTimeout(preferenceTimer.current);
    const next = pendingPreferences.current;
    const client = supabase;
    if (!next || demo || !userId || !client) return preferenceQueue.current;
    pendingPreferences.current = null;
    preferenceQueue.current = preferenceQueue.current
      .catch(() => {})
      .then(async () => {
        const { error } = await client.from('reader_preferences').upsert({
          user_id: userId,
          theme: next.theme,
          font_family: next.font,
          font_size: next.fontSize,
          line_height: next.lineHeight,
          reduced_motion: next.reducedMotion,
          page_width: next.pageWidth,
          margin: next.margin,
          layout: next.layout,
          tts_rate: next.ttsRate,
        });
        if (error) throw error;
      })
      .catch(() => {
        if (!pendingPreferences.current) pendingPreferences.current = next;
        setSyncError('Your preferences could not be synced. Reload and try again.');
      });
    return preferenceQueue.current;
  }, [demo, userId]);
  const flushChanges = useCallback(async () => {
    await Promise.all([...readingSavers.current].map((save) => save().catch(() => {})));
    await flushPreferences();
    await shelfQueue.current;
  }, [flushPreferences]);
  const registerReadingSaver = useCallback((save: () => Promise<void>) => {
    readingSavers.current.add(save);
    return () => {
      readingSavers.current.delete(save);
    };
  }, []);
  useEffect(
    () => () => {
      void flushPreferences();
    },
    [flushPreferences],
  );

  useEffect(() => {
    let active = true;
    const startedVersion = preferenceVersion.current;
    const load = async () => {
      const data = await (demo ? catalogRepository : cloudCatalogRepository).list();
      if (demo) return { data, cloudPersonal: null, cloudPreferences: null };
      if (!supabase || !userId) throw new Error('Sign-in required');
      const [shelves, progress, prefs] = await Promise.all([
        supabase.from('user_books').select('*').eq('user_id', userId),
        supabase.from('reading_progress').select('*').eq('user_id', userId),
        supabase.from('reader_preferences').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      if (shelves.error || progress.error || prefs.error)
        throw new Error('Your reading settings could not be loaded.');
      const cloudPersonal: Record<string, PersonalBook> = {};
      for (const row of shelves.data ?? [])
        cloudPersonal[row.book_id] = {
          ...defaultPersonalBook,
          status: row.shelf_status as PersonalBook['status'],
          favorite: row.is_favorite,
        };
      for (const row of progress.data ?? [])
        cloudPersonal[row.book_id] = {
          ...(cloudPersonal[row.book_id] ?? { ...defaultPersonalBook, status: 'reading' as const }),
          percentage: row.percentage,
          lastReadAt: row.last_read_at,
        };
      const cloudPreferences = prefs.data
        ? preferenceSchema.parse({
            theme: prefs.data.theme,
            font: prefs.data.font_family,
            fontSize: prefs.data.font_size,
            lineHeight: prefs.data.line_height,
            reducedMotion: prefs.data.reduced_motion,
            pageWidth: prefs.data.page_width,
            margin: prefs.data.margin,
            layout: prefs.data.layout,
            ttsRate: prefs.data.tts_rate,
          })
        : null;
      return { data, cloudPersonal, cloudPreferences };
    };
    load().then(
      ({ data, cloudPersonal, cloudPreferences }) => {
        if (!active) return;
        setBooks(data);
        if (cloudPersonal) {
          personalRef.current = cloudPersonal;
          setPersonal(cloudPersonal);
        }
        if (cloudPreferences && preferenceVersion.current === startedVersion) {
          preferenceRef.current = cloudPreferences;
          setPreferences(cloudPreferences);
        }
        setError(null);
        setSyncError(null);
        setLoading(false);
      },
      () => {
        if (active) {
          setError('Your library could not be loaded. Please try again.');
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, demo, userId]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'auto';
  }, [preferences.theme, preferences.reducedMotion]);
  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      const next = preferenceSchema.parse({ ...preferenceRef.current, ...patch });
      preferenceRef.current = next;
      preferenceVersion.current++;
      setPreferences(next);
      if (!writeStored(preferenceKey, next)) setStorageError(true);
      if (!demo && userId) {
        pendingPreferences.current = next;
        if (preferenceTimer.current) clearTimeout(preferenceTimer.current);
        preferenceTimer.current = setTimeout(() => {
          void flushPreferences();
        }, 300);
      }
    },
    [preferenceKey, demo, userId, flushPreferences],
  );
  const updateBook = useCallback(
    (id: string, patch: Partial<PersonalBook>) => {
      const state = { ...(personalRef.current[id] ?? defaultPersonalBook), ...patch };
      const next = { ...personalRef.current, [id]: state };
      personalRef.current = next;
      setPersonal(next);
      if (demo) {
        if (!writeStored('folio.demo.shelves.v1', next)) setStorageError(true);
      } else if (userId && supabase) {
        const client = supabase;
        shelfQueue.current = shelfQueue.current
          .catch(() => {})
          .then(async () => {
            const { error } = await client.from('user_books').upsert({
              user_id: userId,
              book_id: id,
              shelf_status: state.status,
              is_favorite: state.favorite,
              updated_at: new Date().toISOString(),
            });
            if (error) throw error;
          })
          .catch(() =>
            setSyncError('Your shelf changes could not be synced. Reload and try again.'),
          );
      }
    },
    [demo, userId],
  );
  const retry = useCallback(() => {
    setLoading(true);
    void flushChanges().finally(() => setAttempt((n) => n + 1));
  }, [flushChanges]);
  return (
    <AppContext.Provider
      value={{
        books,
        loading,
        error,
        retry,
        personal,
        updateBook,
        preferences,
        updatePreferences,
        storageError,
        syncError,
        reportSyncError: setSyncError,
        flushChanges,
        registerReadingSaver,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
