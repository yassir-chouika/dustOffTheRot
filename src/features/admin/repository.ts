import { supabase } from '../../lib/supabase';
import { validateBookFile, validateCover } from './validation';
import type { Database } from '../../types/database';

export type CatalogRow = Database['public']['Tables']['books']['Row'];
export type BookInput = Pick<
  CatalogRow,
  'title' | 'author' | 'description' | 'genre' | 'language' | 'is_published'
>;
const client = () => {
  if (!supabase) throw new Error('Sign in to manage your library.');
  return supabase;
};
export async function listCatalog() {
  const { data, error } = await client()
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('The catalog could not be loaded.');
  return data;
}
export async function importBook(
  input: BookInput,
  file: File | null,
  cover: File | null,
  progress: (label: string) => void,
  existing?: CatalogRow,
) {
  const uploaded: { bucket: string; path: string }[] = [];
  const oldFiles: { bucket: string; path: string }[] = [];
  let committed = false;
  try {
    let path = existing?.storage_path;
    let coverPath = existing?.cover_path ?? null;
    let format = existing?.format;
    let length = existing?.length_label ?? '';
    if (file) {
      progress('Checking book…');
      const metadata = await validateBookFile(file);
      if (existing && metadata.format !== existing.format)
        throw new Error('A replacement must use the same format as the original book.');
      format = metadata.format;
      length = metadata.length;
      path = `${crypto.randomUUID()}/book.${format.toLowerCase()}`;
      progress('Uploading book…');
      const { error } = await client()
        .storage.from('books')
        .upload(path, file, {
          contentType: format === 'PDF' ? 'application/pdf' : 'application/epub+zip',
          upsert: false,
        });
      if (error)
        throw new Error(
          'The book upload failed. Check your connection and storage quota, then try again.',
        );
      uploaded.push({ bucket: 'books', path });
      if (existing) oldFiles.push({ bucket: 'books', path: existing.storage_path });
    }
    if (!path || !format) throw new Error('Choose a PDF or EPUB first.');
    if (cover) {
      progress('Checking cover…');
      const extension = await validateCover(cover);
      const nextCoverPath = `${crypto.randomUUID()}/cover.${extension}`;
      const { error } = await client()
        .storage.from('covers')
        .upload(nextCoverPath, cover, {
          contentType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
          upsert: false,
        });
      if (error) throw new Error('The cover could not be uploaded.');
      uploaded.push({ bucket: 'covers', path: nextCoverPath });
      if (coverPath) oldFiles.push({ bucket: 'covers', path: coverPath });
      coverPath = nextCoverPath;
    }
    progress('Saving to your library…');
    const record = {
      ...input,
      storage_path: path,
      cover_path: coverPath,
      format,
      length_label: length,
    };
    const result = existing
      ? await client().from('books').update(record).eq('id', existing.id).select('id').single()
      : await client().from('books').insert(record).select('id').single();
    if (result.error)
      throw new Error('The book could not be saved. Your upload will be cleaned up.');
    committed = true;
    const cleanup = await cleanupFiles(oldFiles);
    return { id: result.data.id, cleanup };
  } catch (error) {
    const pending = committed ? [] : await cleanupFiles(uploaded);
    if (pending.length)
      throw new Error(
        `${error instanceof Error ? error.message : 'Import failed.'} Temporary-file cleanup also failed; the owner can remove the unused upload from Storage.`,
        { cause: error },
      );
    throw error;
  }
}
export async function cleanupFiles(files: { bucket: string; path: string }[]) {
  const pending: typeof files = [];
  for (const file of files) {
    try {
      const { error } = await client().storage.from(file.bucket).remove([file.path]);
      if (error) pending.push(file);
    } catch {
      pending.push(file);
    }
  }
  return pending;
}
export async function removeBook(book: CatalogRow) {
  const { error } = await client().from('books').delete().eq('id', book.id).select('id').single();
  if (error) throw new Error('This book could not be removed.');
  return cleanupFiles([
    { bucket: 'books', path: book.storage_path },
    ...(book.cover_path ? [{ bucket: 'covers', path: book.cover_path }] : []),
  ]);
}
