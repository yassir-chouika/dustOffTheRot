import type { Book } from '../../types';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function Cover({ book, className = '' }: { book: Book; className?: string }) {
  const [cover, setCover] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!book.coverPath || !supabase) return;
    let active = true;
    const path = book.coverPath;
    void supabase.storage
      .from('covers')
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (active && data) setCover({ path, url: data.signedUrl });
      });
    return () => {
      active = false;
    };
  }, [book.coverPath]);
  if (cover && cover.path === book.coverPath)
    return (
      <div className={`book-cover uploaded-cover ${className}`} aria-hidden="true">
        <img src={cover.url} alt="" loading="lazy" onError={() => setCover(null)} />
      </div>
    );
  return (
    <div className={`book-cover cover-${book.color} ${className}`} aria-hidden="true">
      <div className="cover-spine" />
      <span className="cover-label">{book.coverLabel}</span>
      <span className="cover-title">{book.title}</span>
      <div className={`cover-art motif-${book.motif}`}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="cover-author">{book.author}</span>
    </div>
  );
}
