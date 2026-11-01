import { useLayoutEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Search, X } from 'lucide-react';
import { useApp } from '../../app/state';
import { Cover } from '../books/Cover';
import { defaultPersonalBook, selectBooks } from './catalog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { Button } from '../../components/ui/Button';
import type { Book, LibraryQuery, Shelf } from '../../types';

const shelves: { id: Shelf; label: string }[] = [
  { id: 'all', label: 'All books' },
  { id: 'reading', label: 'Reading' },
  { id: 'want-to-read', label: 'Want to read' },
  { id: 'finished', label: 'Finished' },
  { id: 'favorites', label: 'Favorites' },
];

function BookCard({ book }: { book: Book }) {
  const { personal, updateBook } = useApp();
  const state = personal[book.id] ?? defaultPersonalBook;
  return (
    <article className="book-card">
      <Link
        to={`/books/${book.id}`}
        className="book-card-link"
        aria-label={`${book.title} by ${book.author}`}
      >
        <div className="book-card-surface">
          <Cover book={book} />
          <span className="format-badge">{book.format}</span>
        </div>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
      </Link>
      <div className="book-card-bottom">
        <span>
          {state.status === 'reading'
            ? `${Math.round(state.percentage)}% read`
            : state.status === 'finished'
              ? 'Finished'
              : book.genre}
        </span>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Favorite ${book.title}`}
          aria-pressed={state.favorite}
          onClick={() => updateBook(book.id, { favorite: !state.favorite })}
        >
          <Heart size={16} fill={state.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      </div>
      {state.status === 'reading' && (
        <progress
          className="reading-progress"
          value={state.percentage}
          max={100}
          aria-label={`${book.title} reading progress`}
        />
      )}
    </article>
  );
}

export function Library() {
  const { books, personal, loading, error, retry } = useApp();
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  useLayoutEffect(() => {
    latestParams.current = params;
  }, [params]);
  const shelf = shelves.find((item) => item.id === params.get('shelf'))?.id ?? 'all';
  const query: LibraryQuery = {
    search: params.get('q') ?? '',
    shelf,
    format:
      params.get('format') === 'PDF' ? 'PDF' : params.get('format') === 'EPUB' ? 'EPUB' : 'all',
    genre: params.get('genre') ?? 'all',
    sort:
      params.get('sort') === 'title'
        ? 'title'
        : params.get('sort') === 'author'
          ? 'author'
          : 'recent',
  };
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(latestParams.current);
    if (!value || value === 'all' || (name === 'sort' && value === 'recent')) next.delete(name);
    else next.set(name, value);
    latestParams.current = next;
    setParams(next, { replace: true });
  };
  const clearFilters = () => {
    latestParams.current = new URLSearchParams();
    setParams(latestParams.current, { replace: true });
  };
  const filtered = selectBooks(books, personal, query);
  const continuing = selectBooks(books, personal, {
    ...query,
    search: '',
    shelf: 'reading',
    format: 'all',
    genre: 'all',
    sort: 'recent',
  }).slice(0, 2);
  const showContinue =
    shelf === 'all' && !query.search && query.format === 'all' && query.genre === 'all';
  return (
    <>
      <header className="page-header library-header">
        <div>
          <p className="eyebrow">YOUR OWN LITTLE CORNER</p>
          <h1>A little room for reading.</h1>
          <p className="muted">Good stories. Open windows. A little time for yourself.</p>
        </div>
        <Link className="text-link" to="/settings">
          Find your reading atmosphere <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Your library needs a moment" message={error} onRetry={retry} />
      ) : (
        <>
          {showContinue && continuing.length > 0 && (
            <section className="continue-section" aria-labelledby="continue-title">
              <div className="section-title">
                <h2 id="continue-title">Pick up where you left off</h2>
                <span className="eyebrow">NO RUSH. JUST ONE MORE PAGE.</span>
              </div>
              <div className="continue-grid">
                {continuing.map((book) => (
                  <Link key={book.id} to={`/read/${book.id}`} className="continue-card">
                    <Cover book={book} />
                    <div>
                      <span className="eyebrow">CONTINUE READING</span>
                      <h3>{book.title}</h3>
                      <p>{book.author}</p>
                      <progress
                        className="reading-progress"
                        value={personal[book.id]?.percentage ?? 0}
                        max={100}
                        aria-label={`${book.title} progress`}
                      />
                      <span className="continue-action">
                        <BookOpen size={15} aria-hidden="true" />
                        Return to your book <ArrowRight size={15} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="collection-title" className="collection">
            <div className="section-title">
              <h2 id="collection-title">
                Your bookshelf <span className="collection-count">{books.length}</span>
              </h2>
              <span className="muted">A story for every kind of day.</span>
            </div>
            <div className="shelf-tabs" role="group" aria-label="Filter by shelf">
              {shelves.map((item) => (
                <button
                  key={item.id}
                  className={shelf === item.id ? 'selected' : ''}
                  aria-pressed={shelf === item.id}
                  onClick={() => change('shelf', item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="library-filters">
              <label className="search-field">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Search books</span>
                <input
                  type="search"
                  placeholder="Title, author, or a little curiosity…"
                  value={query.search}
                  onChange={(event) => change('q', event.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Format</span>
                <select
                  value={query.format}
                  onChange={(event) => change('format', event.target.value)}
                >
                  <option value="all">All formats</option>
                  <option>EPUB</option>
                  <option>PDF</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Genre</span>
                <select
                  value={query.genre}
                  onChange={(event) => change('genre', event.target.value)}
                >
                  <option value="all">All genres</option>
                  {[...new Set(books.map((book) => book.genre))].sort().map((genre) => (
                    <option key={genre}>{genre}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Sort books</span>
                <select value={query.sort} onChange={(event) => change('sort', event.target.value)}>
                  <option value="recent">Recently read</option>
                  <option value="title">Title A–Z</option>
                  <option value="author">Author A–Z</option>
                </select>
              </label>
            </div>
            <p className="result-count" role="status">
              {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
              {query.search && ` matching “${query.search}”`}
            </p>
            {filtered.length ? (
              <div className="book-grid">
                {filtered.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  books.length
                    ? 'No books in this corner yet'
                    : 'A fresh shelf, full of possibility'
                }
              >
                <p>
                  {books.length
                    ? 'Try a different search or shelf.'
                    : 'Your library will appear here when books are added.'}
                </p>
                {books.length > 0 && (
                  <Button onClick={clearFilters}>
                    <X size={15} aria-hidden="true" />
                    Clear filters
                  </Button>
                )}
              </EmptyState>
            )}
          </section>
        </>
      )}
      <p className="notice">Preview collection · fictional books and browser-local shelves.</p>
    </>
  );
}
