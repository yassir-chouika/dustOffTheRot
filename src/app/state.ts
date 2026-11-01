import { createContext, useContext } from 'react';
import type { Book, PersonalBook, Preferences } from '../types';

export interface AppState {
  books: Book[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  personal: Record<string, PersonalBook>;
  updateBook: (id: string, patch: Partial<PersonalBook>) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  storageError: boolean;
}

export const AppContext = createContext<AppState | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Folio must be wrapped in AppProvider');
  return context;
}
