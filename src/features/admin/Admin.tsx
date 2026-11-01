import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../auth/state';
import { useApp } from '../../app/state';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { validateBookFile } from './validation';
import { cleanupFiles, importBook, listCatalog, removeBook } from './repository';
import type { BookInput, CatalogRow } from './repository';

const inputSchema = z.object({
  title: z.string().trim().min(1, 'Give your book a title.').max(300),
  author: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || 'Unknown author'),
  description: z.string().max(10000),
  genre: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || 'Uncategorized'),
  language: z
    .string()
    .regex(/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i, 'Use a language code such as en or fr.')
    .max(35),
  is_published: z.boolean(),
});
const blank: BookInput = {
  title: '',
  author: '',
  description: '',
  genre: '',
  language: 'en',
  is_published: true,
};

function BookFields({
  value,
  onChange,
  disabled,
}: {
  value: BookInput;
  onChange: (value: BookInput) => void;
  disabled: boolean;
}) {
  const patch = (key: keyof BookInput, next: string | boolean) =>
    onChange({ ...value, [key]: next });
  return (
    <fieldset className="metadata-fields" disabled={disabled}>
      <div className="form-columns">
        <label>
          Title
          <input
            className="field-input"
            name="title"
            required
            maxLength={300}
            value={value.title}
            onChange={(e) => patch('title', e.target.value)}
          />
        </label>
        <label>
          Author
          <input
            className="field-input"
            name="author"
            maxLength={300}
            placeholder="Unknown author"
            value={value.author}
            onChange={(e) => patch('author', e.target.value)}
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          className="field-input"
          rows={4}
          maxLength={10000}
          value={value.description}
          onChange={(e) => patch('description', e.target.value)}
        />
      </label>
      <div className="form-columns">
        <label>
          Genre
          <input
            className="field-input"
            maxLength={100}
            placeholder="Uncategorized"
            value={value.genre}
            onChange={(e) => patch('genre', e.target.value)}
          />
        </label>
        <label>
          Language
          <input
            className="field-input"
            required
            maxLength={35}
            value={value.language}
            onChange={(e) => patch('language', e.target.value)}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={value.is_published}
          onChange={(e) => patch('is_published', e.target.checked)}
        />
        Make available to readers
      </label>
    </fieldset>
  );
}

function EditBook({
  book,
  onSaved,
  onCleanup,
}: {
  book: CatalogRow;
  onSaved: () => void;
  onCleanup: (files: { bucket: string; path: string }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<BookInput>(book);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    const parsed = inputSchema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy('Saving changes…');
    try {
      const result = await importBook(parsed.data, file, cover, setBusy, book);
      onCleanup(result.cleanup);
      onSaved();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your changes could not be saved.');
    } finally {
      setBusy('');
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next);
          if (next) {
            setFields(book);
            setFile(null);
            setCover(null);
            setError('');
          }
        }
      }}
      title="Edit book"
      description="Keep the details just right for your readers."
      trigger={
        <Button size="icon" aria-label={`Edit ${book.title}`}>
          <Pencil size={16} aria-hidden="true" />
        </Button>
      }
    >
      <form className="admin-form" onSubmit={submit}>
        <BookFields value={fields} onChange={setFields} disabled={!!busy} />
        <label>
          Replace book file
          <input
            className="field-input"
            type="file"
            accept={book.format === 'PDF' ? '.pdf' : '.epub'}
            disabled={!!busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <small>
            A replacement must use the same format. Existing reading positions and bookmarks may no
            longer match.
          </small>
        </label>
        <label>
          Replace cover
          <input
            className="field-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={!!busy}
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button variant="primary" disabled={!!busy} type="submit">
          {busy || 'Save changes'}
        </Button>
      </form>
    </Dialog>
  );
}

function DeleteBook({
  book,
  onDeleted,
  onCleanup,
}: {
  book: CatalogRow;
  onDeleted: () => void;
  onCleanup: (files: { bucket: string; path: string }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onCleanup(await removeBook(book));
      onDeleted();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The book could not be removed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
      title="Remove this book?"
      description={`“${book.title}” will leave the library. Its files, reading progress, and bookmarks will be removed.`}
      trigger={
        <Button size="icon" aria-label={`Remove ${book.title}`}>
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      }
    >
      <p>
        This cannot be undone. You can unpublish the book instead to keep it and its saved
        positions.
      </p>
      {error && <p role="alert">{error}</p>}
      <Button onClick={remove} disabled={busy}>
        {busy ? 'Removing…' : 'Remove book and saved positions'}
      </Button>
    </Dialog>
  );
}

function OwnerCatalog() {
  const { retry } = useApp();
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [fields, setFields] = useState<BookInput>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ bucket: string; path: string }[]>([]);
  const selection = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    let active = true;
    listCatalog().then(
      (data) => {
        if (active) {
          setCatalog(data);
          setCatalogError('');
        }
      },
      () => {
        if (active) setCatalogError('The catalog could not be loaded.');
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const refresh = () => {
    setAttempt((n) => n + 1);
    retry();
  };
  const selected = async (next: File | null) => {
    const revision = ++selection.current;
    setFile(null);
    setError('');
    setMessage('');
    if (!next) return;
    setChecking(true);
    try {
      const meta = await validateBookFile(next);
      if (selection.current === revision) {
        setFile(next);
        setFields((previous) => ({
          ...previous,
          title: meta.title || next.name.replace(/\.(pdf|epub)$/i, ''),
          author: meta.author,
          language: meta.language,
        }));
      }
    } catch (e) {
      if (selection.current === revision)
        setError(e instanceof Error ? e.message : 'This file could not be checked.');
    } finally {
      if (selection.current === revision) setChecking(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || checking || !file) return;
    setError('');
    setMessage('');
    const parsed = inputSchema.safeParse(fields);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (!rights) {
      setError('Confirm that you have permission to use and share this book.');
      return;
    }
    setBusy('Preparing your book…');
    try {
      const result = await importBook(parsed.data, file, cover, setBusy);
      setPendingFiles((previous) => [...previous, ...result.cleanup]);
      setMessage(
        `“${parsed.data.title}” is ${parsed.data.is_published ? 'ready in your library' : 'saved as a draft'}.`,
      );
      setFields(blank);
      setFile(null);
      setCover(null);
      setRights(false);
      formRef.current?.reset();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your book could not be imported.');
    } finally {
      setBusy('');
    }
  };
  const toggle = async (book: CatalogRow) => {
    const { error } = await supabase!
      .from('books')
      .update({ is_published: !book.is_published })
      .eq('id', book.id)
      .select('id')
      .single();
    if (error) setCatalogError('Publication could not be changed. Please try again.');
    else refresh();
  };
  const addCleanup = (files: typeof pendingFiles) =>
    setPendingFiles((previous) => [...previous, ...files]);
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">CURATE YOUR READING ROOM</p>
        <h1>Make room for a good book.</h1>
        <p className="muted">Import once. Find it on your shelf whenever you’re ready.</p>
      </header>
      <section className="settings-panel import-panel">
        <h2>
          <Plus size={23} aria-hidden="true" />
          Import a book
        </h2>
        <form className="admin-form" aria-label="Import a book" ref={formRef} onSubmit={submit}>
          <div className="form-columns">
            <label className="upload-field">
              <Upload size={24} aria-hidden="true" />
              <span>Choose a PDF or EPUB</span>
              <small>Up to 50 MB · EPUBs up to 40 MB expanded</small>
              <input
                type="file"
                name="book"
                accept=".pdf,.epub"
                required
                disabled={!!busy || checking}
                onChange={(e) => void selected(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="upload-field">
              <span>Add a cover, if you like</span>
              <small>PNG, JPEG, WebP · up to 5 MB</small>
              <input
                type="file"
                name="cover"
                accept="image/png,image/jpeg,image/webp"
                disabled={!!busy}
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <BookFields value={fields} onChange={setFields} disabled={!!busy || checking} />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rights}
              disabled={!!busy}
              onChange={(e) => setRights(e.target.checked)}
              required
            />
            I have permission to use and share this book with my invited readers.
          </label>
          {(checking || busy) && (
            <p role="status" className="notice">
              {checking ? 'Checking file and reading metadata…' : busy}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <Button type="submit" variant="primary" disabled={!!busy || checking || !file}>
            {busy || 'Add to library'}
          </Button>
        </form>
      </section>
      <section className="catalog-section">
        <div className="section-title">
          <h2>Your collection</h2>
          <span className="muted">Published books are visible to invited readers.</span>
        </div>
        {catalogError ? (
          <ErrorState
            title="The catalog needs a moment"
            message={catalogError}
            onRetry={() => setAttempt((n) => n + 1)}
          />
        ) : !catalog ? (
          <LoadingState />
        ) : catalog.length === 0 ? (
          <EmptyState title="A fresh shelf, full of possibility">
            <p>Import your first book above.</p>
          </EmptyState>
        ) : (
          <ul className="admin-catalog">
            {catalog.map((book) => (
              <li key={book.id}>
                <div>
                  <strong>{book.title}</strong>
                  <span>
                    {book.author} · {book.format} · {book.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="catalog-actions">
                  <Button onClick={() => void toggle(book)}>
                    {book.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <EditBook book={book} onSaved={refresh} onCleanup={addCleanup} />
                  <DeleteBook book={book} onDeleted={refresh} onCleanup={addCleanup} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {pendingFiles.length > 0 && (
          <div className="sync-notice" role="alert">
            <p>The book is saved, but some unused files still need cleanup.</p>
            <Button onClick={async () => setPendingFiles(await cleanupFiles(pendingFiles))}>
              Retry file cleanup
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

export function Admin() {
  const { demo, profile } = useAuth();
  if (demo)
    return (
      <EmptyState title="A thoughtful library starts here">
        <p>
          This preview does not accept uploads. Sign in to your private library to import books.
        </p>
        <Link className="button" to="/">
          Return to library
        </Link>
      </EmptyState>
    );
  if (profile?.role !== 'admin')
    return (
      <EmptyState title="Library management is private">
        <p>Only the library owner can import and manage books.</p>
        <Link className="button" to="/">
          Back to library
        </Link>
      </EmptyState>
    );
  return <OwnerCatalog />;
}

export default Admin;
