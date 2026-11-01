import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { AppContext } from './state';
import { catalogRepository, defaultPersonalBook, seedPersonal } from '../features/library/catalog';
import { readStored, writeStored } from '../lib/storage';
import type { Book, PersonalBook, Preferences } from '../types';

const preferenceSchema = z.object({
  theme: z.enum(['paper', 'midnight', 'forest', 'classic']),
  font: z.enum(['serif', 'sans']),
  fontSize: z.number().min(14).max(32),
  lineHeight: z.number().min(1.3).max(2.2),
  reducedMotion: z.boolean(),
});
const personalSchema = z.record(
  z.string(),
  z.object({
    status: z.enum(['want-to-read', 'reading', 'finished']),
    favorite: z.boolean(),
    percentage: z.number().min(0).max(100),
    lastReadAt: z.string().nullable(),
  }),
);
const defaults: Preferences = {
  theme: 'paper',
  font: 'serif',
  fontSize: 20,
  lineHeight: 1.8,
  reducedMotion: false,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>(() =>
    readStored(
      'folio.preferences.v1',
      defaults,
      (v): v is Preferences => preferenceSchema.safeParse(v).success,
    ),
  );
  const [personal, setPersonal] = useState<Record<string, PersonalBook>>(() =>
    readStored(
      'folio.demo.shelves.v1',
      seedPersonal,
      (v): v is Record<string, PersonalBook> => personalSchema.safeParse(v).success,
    ),
  );
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let active = true;
    catalogRepository.list().then(
      (data) => {
        if (active) {
          setBooks(data);
          setError(null);
          setLoading(false);
        }
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
  }, [attempt]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'auto';
  }, [preferences.theme, preferences.reducedMotion]);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((previous) => {
      const next = preferenceSchema.parse({ ...previous, ...patch });
      if (!writeStored('folio.preferences.v1', next)) setStorageError(true);
      return next;
    });
  }, []);
  const updateBook = useCallback((id: string, patch: Partial<PersonalBook>) => {
    setPersonal((previous) => {
      const next = { ...previous, [id]: { ...(previous[id] ?? defaultPersonalBook), ...patch } };
      if (!writeStored('folio.demo.shelves.v1', next)) setStorageError(true);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        books,
        loading,
        error,
        retry: () => {
          setLoading(true);
          setAttempt((n) => n + 1);
        },
        personal,
        updateBook,
        preferences,
        updatePreferences,
        storageError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
