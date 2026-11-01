import { Link, Route, Routes, useParams } from 'react-router-dom';
import { AppProvider } from './Provider';
import { useApp } from './state';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/EmptyState';
import { Library } from '../features/library/Library';
import { BookDetails } from '../features/books/BookDetails';
import { Settings } from '../features/settings/Settings';
import { LoadingState, ErrorState } from '../components/Feedback';

function BookPlaceholder({ reader = false }: { reader?: boolean }) {
  const { id } = useParams();
  const { books, loading, error, retry } = useApp();
  const book = books.find((entry) => entry.id === id);
  if (loading) return <LoadingState label="Loading book…" />;
  if (error) return <ErrorState title="Could not load this book" message={error} onRetry={retry} />;
  if (!book) return <NotFound />;
  return (
    <>
      <Link className="back-link" to="/">
        ← Back to library
      </Link>
      <header className="page-header">
        <p className="eyebrow">{reader ? 'READER PREVIEW' : 'BOOK DETAILS PREVIEW'}</p>
        <h1>{book.title}</h1>
        <p className="muted">
          {book.author} · {book.format}
        </p>
      </header>
      <EmptyState title={reader ? 'Your reading room is on its way' : 'A place for every book'}>
        <p>
          {reader
            ? 'Book reading is coming soon. This fictional book has no attached file.'
            : 'Book details are coming soon. This is fictional preview metadata.'}
        </p>
        {!reader && (
          <Link className="button" to={`/read/${book.id}`}>
            View reader placeholder
          </Link>
        )}
      </EmptyState>
    </>
  );
}

function AdminPlaceholder() {
  return (
    <EmptyState title="A thoughtful library starts here">
      <p>
        Admin sign-in and importing are coming soon. This preview does not accept uploads or grant
        admin access.
      </p>
      <Link className="button" to="/">
        Return to library
      </Link>
    </EmptyState>
  );
}

function About() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">ABOUT FOLIO</p>
        <h1>Made for the love of a good book.</h1>
      </header>
      <div className="settings-panel">
        <p>
          Folio is a personal, invite-only reading app in development. This foundation preview uses
          fictional book metadata and browser-local preferences.
        </p>
        <p>
          Authentication, cloud storage, document reading, and read-aloud are not connected yet. No
          real books or private reading activity are included.
        </p>
        <Link className="button" to="/">
          Back to your reading room
        </Link>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <EmptyState title="This page is missing">
      <p>Let’s find your way back to the reading room.</p>
      <Link className="button" to="/">
        Back to library
      </Link>
    </EmptyState>
  );
}

export function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Library />} />
          <Route path="books/:id" element={<BookDetails />} />
          <Route path="read/:id" element={<BookPlaceholder reader />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminPlaceholder />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
