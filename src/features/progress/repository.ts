import { z } from 'zod';
import { demoMode, supabase } from '../../lib/supabase';
import { readStored, writeStored } from '../../lib/storage';
import type { BookmarkRecord, Locator, ReadingPosition } from '../../types';

export const locatorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('pdf'),
    page: z.number().int().min(0).max(1000000),
    zoom: z.number().min(0.5).max(3).optional(),
    offset: z.number().min(0).max(1).optional(),
  }),
  z.object({
    type: z.literal('epub'),
    cfi: z.string().startsWith('epubcfi(').endsWith(')').max(4000),
  }),
]);
const positionSchema = z.object({
  locator: locatorSchema,
  percentage: z.number().min(0).max(100),
  lastReadAt: z.string(),
});
const bookmarkSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  locator: locatorSchema,
  label: z.string().max(300),
  createdAt: z.string(),
});
export function decodeLocator(type: string, value: unknown): Locator | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return locatorSchema.safeParse({ ...value, type }).data ?? null;
}
function dbLocator(locator: Locator) {
  return locator.type === 'pdf'
    ? {
        page: locator.page,
        ...(locator.zoom ? { zoom: locator.zoom } : {}),
        ...(locator.offset ? { offset: locator.offset } : {}),
      }
    : { cfi: locator.cfi };
}
export async function loadPosition(
  bookId: string,
  userId?: string,
): Promise<ReadingPosition | null> {
  if (demoMode)
    return (
      positionSchema.safeParse(
        readStored<unknown>(
          `folio.demo.position.v1.${bookId}`,
          null,
          (value): value is unknown => value !== undefined,
        ),
      ).data ?? null
    );
  if (!supabase || !userId) throw new Error('Sign in to restore your position.');
  const { data, error } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();
  if (error)
    throw new Error(
      'Your saved position could not be loaded. Try again before starting a new session.',
    );
  if (!data) return null;
  const locator = decodeLocator(data.locator_type, data.locator);
  return locator ? { locator, percentage: data.percentage, lastReadAt: data.last_read_at } : null;
}
export async function savePosition(bookId: string, position: ReadingPosition, userId?: string) {
  const next = positionSchema.parse(position);
  if (demoMode) {
    if (!writeStored(`folio.demo.position.v1.${bookId}`, next))
      throw new Error('Browser storage is unavailable. Your position could not be saved.');
    return;
  }
  if (!supabase || !userId) throw new Error('Sign in to save your position.');
  const { error } = await supabase.from('reading_progress').upsert({
    user_id: userId,
    book_id: bookId,
    locator_type: next.locator.type,
    locator: dbLocator(next.locator),
    percentage: next.percentage,
    last_read_at: next.lastReadAt,
  });
  if (error)
    throw new Error('Your position could not be synced. Keep this page open and try saving again.');
}
export async function loadBookmarks(bookId: string, userId?: string): Promise<BookmarkRecord[]> {
  if (demoMode)
    return (
      z
        .array(bookmarkSchema)
        .safeParse(
          readStored<unknown>(
            `folio.demo.bookmarks.v1.${bookId}`,
            [],
            (value): value is unknown => value !== undefined,
          ),
        ).data ?? []
    );
  if (!supabase || !userId) throw new Error('Sign in to load your bookmarks.');
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .order('created_at');
  if (error) throw new Error('Your bookmarks could not be loaded.');
  return data.flatMap((row) => {
    const locator = decodeLocator(row.locator_type, row.locator);
    return locator
      ? [{ id: row.id, bookId: row.book_id, locator, label: row.label, createdAt: row.created_at }]
      : [];
  });
}
export async function createBookmark(
  bookId: string,
  locator: Locator,
  label: string,
  userId?: string,
): Promise<BookmarkRecord> {
  const bookmark = bookmarkSchema.parse({
    id: crypto.randomUUID(),
    bookId,
    locator,
    label: label.slice(0, 300),
    createdAt: new Date().toISOString(),
  });
  if (demoMode) {
    const previous = await loadBookmarks(bookId);
    if (!writeStored(`folio.demo.bookmarks.v1.${bookId}`, [...previous, bookmark]))
      throw new Error('Your bookmark could not be saved.');
    return bookmark;
  }
  if (!supabase || !userId) throw new Error('Sign in to save a bookmark.');
  const { error } = await supabase.from('bookmarks').insert({
    id: bookmark.id,
    user_id: userId,
    book_id: bookId,
    locator_type: locator.type,
    locator: dbLocator(locator),
    label: bookmark.label,
  });
  if (error) throw new Error('Your bookmark could not be saved.');
  return bookmark;
}
export async function deleteBookmark(bookId: string, id: string, userId?: string) {
  if (demoMode) {
    const previous = await loadBookmarks(bookId);
    if (
      !writeStored(
        `folio.demo.bookmarks.v1.${bookId}`,
        previous.filter((item) => item.id !== id),
      )
    )
      throw new Error('Your bookmark could not be removed.');
    return;
  }
  if (!supabase || !userId) throw new Error('Sign in to remove a bookmark.');
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('book_id', bookId)
    .eq('user_id', userId);
  if (error) throw new Error('Your bookmark could not be removed.');
}
export function keepalivePosition(
  bookId: string,
  position: ReadingPosition,
  userId: string,
  token: string,
) {
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  void fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/reading_progress?on_conflict=user_id,book_id`,
    {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        book_id: bookId,
        locator_type: position.locator.type,
        locator: dbLocator(position.locator),
        percentage: position.percentage,
        last_read_at: position.lastReadAt,
      }),
    },
  ).catch(() => {});
}
