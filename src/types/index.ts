export type Theme = 'paper' | 'midnight' | 'forest' | 'classic';
export type Shelf = 'all' | 'reading' | 'want-to-read' | 'finished' | 'favorites';
export type ReadingStatus = 'want-to-read' | 'reading' | 'finished';
export type BookFormat = 'EPUB' | 'PDF';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  format: BookFormat;
  color: string;
  motif: 'arch' | 'orbit' | 'leaves' | 'waves' | 'window' | 'mountain';
  coverLabel: string;
  year: number;
  length: string;
  storagePath?: string;
  coverPath?: string;
  language?: string;
}

export interface PersonalBook {
  status: ReadingStatus;
  favorite: boolean;
  percentage: number;
  lastReadAt: string | null;
}

export interface Preferences {
  theme: Theme;
  font: 'serif' | 'sans';
  fontSize: number;
  lineHeight: number;
  reducedMotion: boolean;
  pageWidth: number;
  margin: number;
  layout: 'paginated' | 'scroll' | 'spread';
  ttsRate: number;
}

export type Locator =
  { type: 'pdf'; page: number; zoom?: number; offset?: number } | { type: 'epub'; cfi: string };
export interface ReadingPosition {
  locator: Locator;
  percentage: number;
  lastReadAt: string;
}
export interface BookmarkRecord {
  id: string;
  bookId: string;
  locator: Locator;
  label: string;
  createdAt: string;
}

export interface LibraryQuery {
  search: string;
  shelf: Shelf;
  format: 'all' | BookFormat;
  genre: string;
  sort: 'recent' | 'title' | 'author';
}
