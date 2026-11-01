import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { createSampleFile } from '../src/features/books/samples.ts';

// Run explicitly with the owner's ignored local credentials. Never replaces a catalog.
const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
try {
  const { user } = check(
    await client.auth.signInWithPassword({
      email: process.env.FOLIO_OWNER_EMAIL,
      password: process.env.FOLIO_OWNER_PASSWORD,
    }),
  );
  const profile = check(
    await client.from('profiles').select('role,invited').eq('user_id', user.id).single(),
  );
  if (profile.role !== 'admin' || !profile.invited)
    throw new Error('An approved owner is required.');
  const books = check(await client.from('books').select('id').limit(1));
  if (books.length) console.info('Catalog already contains books; nothing was added.');
  else
    for (const [format, title] of [
      ['PDF', 'A Little Room'],
      ['EPUB', 'One More Chapter'],
    ]) {
      const path = `${randomUUID()}/book.${format.toLowerCase()}`;
      const blob = await createSampleFile(format, title);
      check(await client.storage.from('books').upload(path, blob, { contentType: blob.type }));
      try {
        check(
          await client.from('books').insert({
            title,
            author: 'Folio',
            format,
            storage_path: path,
            language: 'en',
            genre: 'Short reads',
            description:
              'An original Folio sample about finding a quiet moment to read. This short sample introduces the reader; the owner can remove it whenever they like.',
            length_label: format === 'PDF' ? '2 pages' : '2 chapters',
            is_published: true,
          }),
        );
      } catch (error) {
        check(await client.storage.from('books').remove([path]));
        throw error;
      }
      console.info(`Added original ${format} sample: ${title}.`);
    }
} finally {
  await client.auth.signOut({ scope: 'local' });
}
