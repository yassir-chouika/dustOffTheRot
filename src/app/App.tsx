import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppProvider } from './Provider';
import { Layout } from '../components/Layout';
import { EmptyState } from '../components/EmptyState';
import { Library } from '../features/library/Library';
import { BookDetails } from '../features/books/BookDetails';
import { Settings } from '../features/settings/Settings';
import { LoadingState } from '../components/Feedback';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthGate } from '../features/auth/AuthGate';
import { useAuth } from '../features/auth/state';

const Reader = lazy(() => import('../features/reader/Reader'));
const Admin = lazy(() => import('../features/admin/Admin'));

function About() {
  const { demo } = useAuth();
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">ABOUT FOLIO</p>
        <h1>Made for the love of a good book.</h1>
      </header>
      <div className="settings-panel">
        <p>
          Folio is a personal reading room for PDFs and EPUBs. Open a book, find a comfortable
          atmosphere, and return to your saved place whenever you’re ready.
        </p>
        <p>
          {demo
            ? 'This preview uses fictional metadata and original sample text. Shelves, settings, bookmarks, and reading positions stay in this browser.'
            : 'Your library is invite-only. The owner manages books; your reading progress, shelves, bookmarks, and preferences belong to your account.'}
        </p>
        <p>
          PDFs keep their original fonts and page colors. EPUB text can reflow to suit your screen.
          Scanned PDFs need OCR for text selection and read-aloud; OCR is not included.
        </p>
        <p>
          Read-aloud uses your browser’s available voices. Voice quality, word highlighting, and
          offline availability vary by device. Speech stops when you leave the reader.
        </p>
        <p>
          Book files are private. Signed access links are temporary access, not DRM. Only import and
          share material you have permission to use.
        </p>
        <p>
          Made with open-source software.{' '}
          <a
            className="text-link"
            href="/third-party-notices.txt"
            target="_blank"
            rel="noopener noreferrer"
          >
            View third-party notices ↗
          </a>
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

function ReadingRoom() {
  const { user, demo } = useAuth();
  return (
    <AppProvider key={demo ? 'demo' : user?.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Library />} />
          <Route path="books/:id" element={<BookDetails />} />
          <Route
            path="read/:id"
            element={
              <Suspense fallback={<LoadingState />}>
                <Reader />
              </Suspense>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={<LoadingState />}>
                <Admin />
              </Suspense>
            }
          />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ReadingRoom />
      </AuthGate>
    </AuthProvider>
  );
}
