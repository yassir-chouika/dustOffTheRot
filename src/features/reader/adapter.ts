import type { Locator, Preferences } from '../../types';

export interface NavigationState {
  label: string;
  canPrevious: boolean;
  canNext: boolean;
  page?: number;
  total?: number;
  toc: { label: string; target: string }[];
}
export interface ReaderHandle {
  previous: () => Promise<void> | void;
  next: () => Promise<void> | void;
  goTo: (locator: Locator) => Promise<void> | void;
  chapter: (target: string) => Promise<void> | void;
  zoom?: (value: number) => void;
}
export interface AdapterProps {
  source: Blob;
  initialLocator: Locator | null;
  preferences: Preferences;
  onLocation: (locator: Locator, percentage: number, label: string) => void;
  onNavigation: (state: NavigationState) => void;
  onText: (text: string, language?: string) => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
  onKeyboard: (event: KeyboardEvent) => void;
}
