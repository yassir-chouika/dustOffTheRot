import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Expand,
  Focus,
  List,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../app/state';
import { useAuth } from '../auth/state';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { ThemePicker } from '../settings/ThemePicker';
import { ReadAloud } from '../audio/ReadAloud';
import { createSampleFile } from '../books/samples';
import {
  createBookmark,
  deleteBookmark,
  keepalivePosition,
  loadBookmarks,
  loadPosition,
  savePosition,
} from '../progress/repository';
import type { Book, BookmarkRecord, Locator, ReadingPosition } from '../../types';
import type { NavigationState, ReaderHandle } from './adapter';

const PdfReader = lazy(() => import('./PdfReader'));
const EpubReader = lazy(() => import('./EpubReader'));
const initialNavigation: NavigationState = {
  label: 'Opening your book…',
  canNext: false,
  canPrevious: false,
  toc: [],
};

function ReaderSession({ book }: { book: Book }) {
  const app = useApp();
  const registerReadingSaver = app.registerReadingSaver;
  const { user, demo } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<{ source: Blob; position: ReadingPosition | null } | null>(
    null,
  );
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [navigation, setNavigation] = useState(initialNavigation);
  const [percentage, setPercentage] = useState(0);
  const [text, setText] = useState('');
  const [language, setLanguage] = useState(book.language || 'en');
  const [panel, setPanel] = useState<'settings' | 'contents' | 'bookmarks' | null>(null);
  const [focused, setFocused] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [guide, setGuide] = useState(false);
  const [guidePosition, setGuidePosition] = useState(40);
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('Position ready');
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [jump, setJump] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [timerMessage, setTimerMessage] = useState('');
  const adapter = useRef<ReaderHandle>(null);
  const frame = useRef<HTMLDivElement>(null);
  const latest = useRef<ReadingPosition | null>(null);
  const lastEvent = useRef('');
  const eventClock = useRef(0);
  const label = useRef('');
  const scheduled = useRef('');
  const saved = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const active = useRef(true);
  const token = useRef('');
  const appRef = useRef(app);
  useLayoutEffect(() => {
    appRef.current = app;
  });
  useEffect(() => {
    let alive = true;
    void (async () => {
      const sourcePromise = demo
        ? createSampleFile(book.format, book.title)
        : (async () => {
            if (!supabase || !book.storagePath) throw new Error('This book has no available file.');
            const { data, error } = await supabase.storage.from('books').download(book.storagePath);
            if (error || !data)
              throw new Error(
                'This book could not be downloaded. It may have been unpublished, or the connection was interrupted.',
              );
            return data;
          })();
      const [source, position, marks] = await Promise.all([
        sourcePromise,
        loadPosition(book.id, userId),
        loadBookmarks(book.id, userId),
      ]);
      if (!alive) return;
      latest.current = position;
      saved.current = position?.lastReadAt ?? '';
      scheduled.current = '';
      setLoaded({ source, position });
      setBookmarks(marks);
      setLoadError('');
    })().catch((error: unknown) => {
      if (alive)
        setLoadError(error instanceof Error ? error.message : 'Your book could not be opened.');
    });
    if (!demo && supabase)
      void supabase.auth.getSession().then(({ data }) => {
        if (alive) token.current = data.session?.access_token ?? '';
      });
    const subscription =
      !demo && supabase
        ? supabase.auth.onAuthStateChange((_event, session) => {
            token.current = session?.access_token ?? '';
          }).data.subscription
        : null;
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, [book.id, book.format, book.storagePath, book.title, demo, userId, attempt]);

  const flush = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    const position = latest.current;
    if (
      !position ||
      scheduled.current === position.lastReadAt ||
      saved.current === position.lastReadAt
    )
      return queue.current;
    scheduled.current = position.lastReadAt;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          await savePosition(book.id, position, userId);
          saved.current = position.lastReadAt;
          appRef.current.updateBook(book.id, {
            percentage: position.percentage,
            lastReadAt: position.lastReadAt,
            status: position.percentage >= 99.9 ? 'finished' : 'reading',
          });
          if (active.current && latest.current?.lastReadAt === position.lastReadAt)
            setSaveStatus(demo ? 'Saved on this device' : 'Position synced');
        } catch (error) {
          if (scheduled.current === position.lastReadAt) scheduled.current = '';
          const notice =
            error instanceof Error ? error.message : 'Your reading position could not be saved.';
          appRef.current.reportSyncError(notice);
          if (active.current) {
            setSaveStatus('Not saved · retry');
            setMessage(notice);
          }
          throw error;
        }
      });
    return queue.current;
  }, [book.id, userId, demo]);
  const onLocation = useCallback(
    (locator: Locator, percent: number, currentLabel: string) => {
      label.current = currentLabel;
      const fingerprint = JSON.stringify([locator, percent]);
      if (lastEvent.current === fingerprint) return;
      lastEvent.current = fingerprint;
      eventClock.current = Math.max(Date.now(), eventClock.current + 1);
      const position = {
        locator,
        percentage: Math.max(0, Math.min(100, percent)),
        lastReadAt: new Date(eventClock.current).toISOString(),
      };
      latest.current = position;
      label.current = currentLabel;
      setPercentage(position.percentage);
      setLocationReady(true);
      setSaveStatus('Saving position…');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush().catch(() => {});
      }, 650);
    },
    [flush],
  );
  useEffect(() => registerReadingSaver(flush), [registerReadingSaver, flush]);
  useEffect(() => {
    active.current = true;
    const leave = () => {
      if (
        latest.current &&
        latest.current.lastReadAt !== saved.current &&
        userId &&
        token.current &&
        !demo
      )
        keepalivePosition(book.id, latest.current, userId, token.current);
      else if (demo) void flush().catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        void flush().catch(() => {});
        leave();
      }
    };
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
      void flush().catch(() => {});
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [book.id, userId, demo, flush]);
  const leaveReader = useCallback(() => {
    void flush().catch(() => {});
    navigate('/');
  }, [flush, navigate]);
  const keyboard = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        (event.target as Element | null)?.closest?.(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (event.key === 'Escape') {
        event.preventDefault();
        leaveReader();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        void adapter.current?.next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        void adapter.current?.previous();
      }
    },
    [leaveReader],
  );
  useEffect(() => {
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [keyboard]);
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) {
        setDeadline(null);
        setTimerMessage('Your quiet reading session is complete. Stay as long as you like.');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  const addMark = async () => {
    if (!latest.current || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const mark = await createBookmark(book.id, latest.current.locator, label.current, userId);
      setBookmarks((previous) => [...previous, mark]);
      setMessage('Bookmark saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your bookmark could not be saved.');
    } finally {
      setBookmarkBusy(false);
    }
  };
  const removeMark = async (mark: BookmarkRecord) => {
    try {
      await deleteBookmark(book.id, mark.id, userId);
      setBookmarks((previous) => previous.filter((item) => item.id !== mark.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your bookmark could not be removed.');
    }
  };
  const fullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen();
      else setMessage('Fullscreen is unavailable in this browser. Focus mode is still available.');
    } catch {
      setMessage('Fullscreen is unavailable here. Try Focus mode.');
    }
  };
  const onText = useCallback(
    (value: string, lang?: string) => {
      setText(value);
      setLanguage(lang || book.language || 'en');
    },
    [book.language],
  );
  const touch = useRef<{ x: number; y: number; time: number } | null>(null);
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  if (loadError)
    return (
      <ErrorState
        title="Your book needs a moment"
        message={loadError}
        onRetry={() => {
          setLoadError('');
          setLoaded(null);
          setAttempt((value) => value + 1);
        }}
      />
    );
  return (
    <div
      className={`reader-shell ${focused ? 'focused' : ''} ${animate ? 'animate-pages' : ''}`}
      ref={frame}
    >
      <header className="reader-header">
        <Button variant="ghost" onClick={leaveReader}>
          <ArrowLeft size={17} aria-hidden="true" />
          Library
        </Button>
        <div className="reader-book-title">
          <h1>{book.title}</h1>
          <span>
            {book.author} · {book.format}
          </span>
        </div>
        <div className="reader-header-actions">
          <Button
            size="icon"
            variant="ghost"
            aria-label={focused ? 'Exit focus mode' : 'Enter focus mode'}
            aria-pressed={focused}
            onClick={() => {
              setFocused(!focused);
              setPanel(null);
            }}
          >
            <Focus size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Toggle fullscreen"
            onClick={() => void fullScreen()}
          >
            <Expand size={18} />
          </Button>
        </div>
      </header>
      <div className="reader-controls">
        <div>
          <Button
            variant={panel === 'contents' ? 'primary' : 'ghost'}
            disabled={book.format === 'PDF'}
            aria-expanded={panel === 'contents'}
            onClick={() => setPanel(panel === 'contents' ? null : 'contents')}
          >
            <List size={16} aria-hidden="true" />
            Contents
          </Button>
          <Button
            variant={panel === 'bookmarks' ? 'primary' : 'ghost'}
            aria-expanded={panel === 'bookmarks'}
            onClick={() => setPanel(panel === 'bookmarks' ? null : 'bookmarks')}
          >
            <Bookmark size={16} aria-hidden="true" />
            Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
          </Button>
        </div>
        <div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Bookmark this location"
            disabled={!loaded || !locationReady || bookmarkBusy}
            onClick={() => void addMark()}
          >
            <Bookmark size={17} />
          </Button>
          <Button
            variant={panel === 'settings' ? 'primary' : 'ghost'}
            aria-expanded={panel === 'settings'}
            onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
          >
            <Settings2 size={17} aria-hidden="true" />
            Reading settings
          </Button>
        </div>
      </div>
      {(message || timerMessage) && (
        <div className="reader-notice" role="status">
          <span>{message || timerMessage}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Dismiss reading notice"
            onClick={() => {
              setMessage('');
              setTimerMessage('');
            }}
          >
            <X size={15} />
          </Button>
        </div>
      )}
      <div className="reader-workspace">
        {panel && (
          <aside
            className="reader-side-panel"
            aria-label={
              panel === 'settings'
                ? 'Reading settings'
                : panel === 'contents'
                  ? 'Book contents'
                  : 'Saved bookmarks'
            }
          >
            <div className="panel-heading">
              <h2>
                {panel === 'settings'
                  ? 'Make yourself comfortable'
                  : panel === 'contents'
                    ? 'Contents'
                    : 'Your bookmarks'}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close reader panel"
                onClick={() => setPanel(null)}
              >
                <X size={18} />
              </Button>
            </div>
            {panel === 'settings' ? (
              <>
                <ThemePicker compact />
                <div className="reader-settings-fields">
                  <label>
                    Page layout
                    <select
                      value={app.preferences.layout}
                      onChange={(e) =>
                        app.updatePreferences({
                          layout: e.target.value as typeof app.preferences.layout,
                        })
                      }
                    >
                      <option value="paginated">Single page</option>
                      <option value="spread">Two-page spread</option>
                      <option value="scroll">Continuous scroll</option>
                    </select>
                  </label>
                  {book.format === 'EPUB' ? (
                    <>
                      <label>
                        Font
                        <select
                          value={app.preferences.font}
                          onChange={(e) =>
                            app.updatePreferences({ font: e.target.value as 'serif' | 'sans' })
                          }
                        >
                          <option value="serif">Literary serif</option>
                          <option value="sans">Clear sans serif</option>
                        </select>
                      </label>
                      <label>
                        Text size · {app.preferences.fontSize}px
                        <input
                          type="range"
                          min={14}
                          max={32}
                          value={app.preferences.fontSize}
                          onChange={(e) =>
                            app.updatePreferences({ fontSize: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Line spacing · {app.preferences.lineHeight}
                        <input
                          type="range"
                          min={1.3}
                          max={2.2}
                          step={0.1}
                          value={app.preferences.lineHeight}
                          onChange={(e) =>
                            app.updatePreferences({ lineHeight: Number(e.target.value) })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p className="muted">
                        PDFs preserve their original fonts and page colors. Zoom changes the page
                        size.
                      </p>
                      <label>
                        PDF zoom
                        <select
                          defaultValue={
                            loaded?.position?.locator.type === 'pdf'
                              ? (loaded.position.locator.zoom ?? 1)
                              : 1
                          }
                          onChange={(e) => adapter.current?.zoom?.(Number(e.target.value))}
                        >
                          <option value={1}>Fit width</option>
                          <option value={0.75}>75%</option>
                          <option value={1.25}>125%</option>
                          <option value={1.5}>150%</option>
                          <option value={2}>200%</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Page width · {app.preferences.pageWidth}px
                    <input
                      type="range"
                      min={320}
                      max={1200}
                      step={20}
                      value={app.preferences.pageWidth}
                      onChange={(e) => app.updatePreferences({ pageWidth: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Page margins · {app.preferences.margin}px
                    <input
                      type="range"
                      min={8}
                      max={80}
                      step={4}
                      value={app.preferences.margin}
                      onChange={(e) => app.updatePreferences({ margin: Number(e.target.value) })}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={app.preferences.reducedMotion}
                      onChange={(e) => app.updatePreferences({ reducedMotion: e.target.checked })}
                    />
                    Reduce motion
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={animate}
                      onChange={(e) => setAnimate(e.target.checked)}
                    />
                    Fade new pages and sections
                  </label>
                  {book.format === 'EPUB' && (
                    <>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={guide}
                          onChange={(e) => setGuide(e.target.checked)}
                        />
                        Reading guide
                      </label>
                      {guide && (
                        <label>
                          Guide position
                          <input
                            type="range"
                            min={5}
                            max={90}
                            value={guidePosition}
                            onChange={(e) => setGuidePosition(Number(e.target.value))}
                          />
                        </label>
                      )}
                    </>
                  )}
                  <label>
                    A little reading time
                    <select
                      value={deadline ? 'active' : ''}
                      onChange={(e) => {
                        setTimerMessage('');
                        setNow(Date.now());
                        setDeadline(
                          e.target.value ? Date.now() + Number(e.target.value) * 60000 : null,
                        );
                      }}
                    >
                      <option value="">No timer</option>
                      {deadline && <option value="active">Session in progress</option>}
                      {[5, 10, 15].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  {deadline && (
                    <p role="timer">
                      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} remaining
                    </p>
                  )}
                  <p className="muted">
                    ← / → to turn pages. Escape returns to your library. Spreads use one page on
                    narrow screens.
                  </p>
                </div>
              </>
            ) : panel === 'contents' ? (
              <nav aria-label="Chapters">
                {navigation.toc.length ? (
                  navigation.toc.map((item, index) => (
                    <button
                      key={`${item.target}-${index}`}
                      className="chapter-link"
                      onClick={() => {
                        void adapter.current?.chapter(item.target);
                        setPanel(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))
                ) : (
                  <p className="muted">This book has no table of contents.</p>
                )}
              </nav>
            ) : (
              <div className="bookmark-list">
                {bookmarks.length ? (
                  bookmarks.map((mark) => (
                    <div key={mark.id}>
                      <button
                        onClick={() => {
                          void adapter.current?.goTo(mark.locator);
                          setPanel(null);
                        }}
                      >
                        {mark.label || 'Saved reading place'}
                        <small>{new Date(mark.createdAt).toLocaleDateString()}</small>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove bookmark ${mark.label || 'saved reading place'}`}
                        onClick={() => void removeMark(mark)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Keep a place you’d like to return to. Use the bookmark button above.
                  </p>
                )}
              </div>
            )}
          </aside>
        )}
        <div
          className="reader-stage"
          style={{ '--reader-page-width': `${app.preferences.pageWidth}px` } as CSSProperties}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch')
              touch.current = { x: event.clientX, y: event.clientY, time: Date.now() };
          }}
          onPointerUp={(event) => {
            const start = touch.current;
            touch.current = null;
            if (
              start &&
              Date.now() - start.time < 500 &&
              Math.abs(event.clientX - start.x) > 70 &&
              Math.abs(event.clientY - start.y) < 40 &&
              window.getSelection()?.isCollapsed
            ) {
              if (event.clientX < start.x) void adapter.current?.next();
              else void adapter.current?.previous();
            }
          }}
        >
          {!loaded ? (
            <LoadingState label="Opening your book…" />
          ) : (
            <Suspense fallback={<LoadingState label="Preparing your reading room…" />}>
              {book.format === 'PDF' ? (
                <PdfReader
                  source={loaded.source}
                  initialLocator={loaded.position?.locator ?? null}
                  preferences={app.preferences}
                  ref={adapter}
                  onLocation={onLocation}
                  onNavigation={setNavigation}
                  onText={onText}
                  onError={setLoadError}
                  onMessage={setMessage}
                  onKeyboard={keyboard}
                />
              ) : (
                <EpubReader
                  source={loaded.source}
                  initialLocator={loaded.position?.locator ?? null}
                  preferences={app.preferences}
                  ref={adapter}
                  onLocation={onLocation}
                  onNavigation={setNavigation}
                  onText={onText}
                  onError={setLoadError}
                  onMessage={setMessage}
                  onKeyboard={keyboard}
                />
              )}
            </Suspense>
          )}
          {guide && book.format === 'EPUB' && (
            <div
              className="reading-guide"
              aria-hidden="true"
              style={{ top: `${guidePosition}%` }}
            />
          )}
        </div>
      </div>
      <footer className="reader-navigation">
        <Button
          aria-label="Previous page"
          disabled={!navigation.canPrevious}
          onClick={() => void adapter.current?.previous()}
        >
          <ArrowLeft size={17} />
          <span>Previous</span>
        </Button>
        <div className="reader-location">
          <span>{navigation.label}</span>
          {navigation.total && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = Number(jump);
                if (Number.isInteger(value) && value >= 1 && value <= navigation.total!) {
                  void adapter.current?.goTo({ type: 'pdf', page: value - 1 });
                  setJump('');
                }
              }}
            >
              <label className="sr-only" htmlFor="jump-page">
                Jump to page
              </label>
              <input
                id="jump-page"
                type="number"
                min={1}
                max={navigation.total}
                value={jump}
                placeholder={String(navigation.page)}
                onChange={(e) => setJump(e.target.value)}
              />
              <Button type="submit" variant="ghost">
                Go
              </Button>
            </form>
          )}
          <span className="reader-save">
            <Check size={12} aria-hidden="true" />
            {Math.round(percentage)}% ·{' '}
            <button onClick={() => void flush().catch(() => {})}>{saveStatus}</button>
          </span>
        </div>
        <Button
          aria-label="Next page"
          disabled={!navigation.canNext}
          onClick={() => void adapter.current?.next()}
        >
          <span>Next</span>
          <ArrowRight size={17} />
        </Button>
      </footer>
      {loaded && <ReadAloud text={text} language={language} format={book.format} />}
    </div>
  );
}

export function Reader() {
  const { id } = useParams();
  const { books, loading, error, retry } = useApp();
  const book = books.find((item) => item.id === id);
  if (loading) return <LoadingState />;
  if (error)
    return <ErrorState title="Your library needs a moment" message={error} onRetry={retry} />;
  if (!book)
    return (
      <EmptyState title="This page is missing">
        <p>This book is no longer available to your account.</p>
        <Link className="button" to="/">
          Back to library
        </Link>
      </EmptyState>
    );
  return <ReaderSession key={`${book.id}:${book.storagePath ?? 'demo'}`} book={book} />;
}

export default Reader;
