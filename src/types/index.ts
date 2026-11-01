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
}

export interface LibraryQuery {
  search: string;
  shelf: Shelf;
  format: 'all' | BookFormat;
  genre: string;
  sort: 'recent' | 'title' | 'author';
}
