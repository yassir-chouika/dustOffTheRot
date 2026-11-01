import { Link, useParams } from 'react-router-dom';
import { BookOpen, Heart } from 'lucide-react';
import { useAuth } from '../auth/state';
import { useApp } from '../../app/state';
import { defaultPersonalBook } from '../library/catalog';
import { Cover } from './Cover';
import { LoadingState, ErrorState } from '../../components/Feedback';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/ui/Button';
import type { ReadingStatus } from '../../types';

export function BookDetails() {
  const { id } = useParams();
  const { demo } = useAuth();
  const { books, personal, updateBook, loading, error, retry } = useApp();
  const book = books.find((item) => item.id === id);
  if (loading) return <LoadingState label="Loading book…" />;
  if (error) return <ErrorState title="Could not load this book" message={error} onRetry={retry} />;
  if (!book)
    return (
      <EmptyState title="This page is missing">
        <p>This book may have moved or is no longer available.</p>
        <Link className="button" to="/">
          Back to library
        </Link>
      </EmptyState>
    );
  const state = personal[book.id] ?? defaultPersonalBook;
  return (
    <>
      <Link to="/" className="back-link">
        ← Back to library
      </Link>
      <div className="book-detail">
        <div className="detail-cover">
          <Cover book={book} />
        </div>
        <div>
          <p className="eyebrow">
            {book.genre} · {book.format}
          </p>
          <h1>{book.title}</h1>
          <p className="book-byline">by {book.author}</p>
          <p className="book-description">{book.description}</p>
          <dl className="book-facts">
            <div>
              <dt>Format</dt>
              <dd>{book.format}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{book.year}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{book.length}</dd>
            </div>
          </dl>
          {state.percentage > 0 && (
            <div className="detail-progress">
              <progress
                className="reading-progress"
                value={state.percentage}
                max={100}
                aria-label="Reading progress"
              />
              <span>{Math.round(state.percentage)}% read</span>
            </div>
          )}
          <div className="book-actions">
            <Link className="button button-primary" to={`/read/${book.id}`}>
              <BookOpen size={17} aria-hidden="true" />
              {state.percentage > 0 ? 'Continue reading' : 'Open book'}
            </Link>
            <Button
              aria-label={`Favorite ${book.title}`}
              aria-pressed={state.favorite}
              onClick={() => updateBook(book.id, { favorite: !state.favorite })}
            >
              <Heart size={17} aria-hidden="true" fill={state.favorite ? 'currentColor' : 'none'} />
              {state.favorite ? 'Favorited' : 'Favorite'}
            </Button>
          </div>
          <label className="shelf-select">
            On your shelf
            <select
              value={state.status}
              onChange={(event) =>
                updateBook(book.id, { status: event.target.value as ReadingStatus })
              }
            >
              <option value="want-to-read">Want to read</option>
              <option value="reading">Currently reading</option>
              <option value="finished">Finished</option>
            </select>
          </label>
          {demo && (
            <p className="notice">Original sample text is included in this fictional preview.</p>
          )}
        </div>
      </div>
    </>
  );
}
