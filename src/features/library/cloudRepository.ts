import { supabase } from '../../lib/supabase';
import type { Book } from '../../types';

export const cloudCatalogRepository = {
  async list(): Promise<Book[]> {
    if (!supabase) throw new Error('The reading room is not connected.');
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      description: row.description,
      genre: row.genre,
      format: row.format as Book['format'],
      color: row.color,
      motif: row.motif as Book['motif'],
      coverLabel: row.cover_label,
      year: row.publication_year,
      length: row.length_label,
      storagePath: row.storage_path,
      coverPath: row.cover_path ?? undefined,
      language: row.language,
    }));
  },
};
