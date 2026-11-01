import type { Book } from '../../types';

export function Cover({ book, className = '' }: { book: Book; className?: string }) {
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
