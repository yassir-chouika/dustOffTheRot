import { Link, Route, Routes, useParams } from 'react-router-dom';
import { AppProvider } from './Provider';
import { useApp } from './state';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/EmptyState';
import { ThemePicker } from '../features/settings/ThemePicker';

function LibraryPlaceholder() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">YOUR OWN LITTLE CORNER</p>
        <h1>A little room for reading.</h1>
        <p className="muted">Settle in. Your next chapter can wait until you’re ready.</p>
      </header>
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <p className="eyebrow">THE FIRST CHAPTER</p>
        <h2 id="welcome-title">Good things begin with a little space.</h2>
        <p>
          Folio’s foundation is here. The bookshelf, book details, and reading engines are coming in
          the next milestones.
        </p>
        <Link className="button button-primary" to="/settings">
          Find your reading atmosphere
        </Link>
      </section>
      <p className="notice">
        Development preview · fictional catalog metadata only. No books are available to read yet.
      </p>
    </>
  );
}

function BookPlaceholder({ reader = false }: { reader?: boolean }) {
  const { id } = useParams();
  const { books, loading, error, retry } = useApp();
  const book = books.find((entry) => entry.id === id);
  if (loading) return <p role="status">Loading book…</p>;
  if (error)
    return (
      <EmptyState title="Could not load this book">
        <p role="alert">{error}</p>
        <button className="button" onClick={retry}>
          Try again
        </button>
      </EmptyState>
    );
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
            ? 'PDF and EPUB rendering will arrive in M06 and M07. This fictional book has no attached file.'
            : 'The full book detail experience arrives in M03.'}
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

function Settings() {
  const { preferences, updatePreferences } = useApp();
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h1>Reading preferences</h1>
        <p className="muted">A comfortable corner, in a color that feels like you.</p>
      </header>
      <section className="settings-panel" aria-labelledby="atmosphere-title">
        <h2 id="atmosphere-title">Your atmosphere</h2>
        <p className="muted">Saved in this browser. Account sync comes in a later milestone.</p>
        <ThemePicker />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(event) => updatePreferences({ reducedMotion: event.target.checked })}
          />
          Reduce interface motion
        </label>
      </section>
    </>
  );
}

function AdminPlaceholder() {
  return (
    <EmptyState title="A thoughtful library starts here">
      <p>
        Admin sign-in and importing are planned for M04–M05. This preview does not accept uploads or
        grant admin access.
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
          <Route index element={<LibraryPlaceholder />} />
          <Route path="books/:id" element={<BookPlaceholder />} />
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
