import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Library,
  Heart,
  Bookmark,
  CircleCheck,
  Settings2,
  Plus,
  Menu,
  X,
  ArrowUpRight,
  Leaf,
} from 'lucide-react';
import { ThemePicker } from '../features/settings/ThemePicker';
import { useApp } from '../app/state';
import { Button } from './ui/Button';

const shelves = [
  { label: 'All books', to: '/', icon: Library, shelf: 'all' },
  { label: 'Currently reading', to: '/?shelf=reading', icon: BookOpen, shelf: 'reading' },
  { label: 'Want to read', to: '/?shelf=want-to-read', icon: Bookmark, shelf: 'want-to-read' },
  { label: 'Finished', to: '/?shelf=finished', icon: CircleCheck, shelf: 'finished' },
  { label: 'Favorites', to: '/?shelf=favorites', icon: Heart, shelf: 'favorites' },
];

export function Layout() {
  const location = useLocation();
  const { books, personal, storageError } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const previousLocation = useRef(location.key);
  useEffect(() => {
    if (previousLocation.current !== location.key) {
      document.getElementById('main-content')?.focus();
      previousLocation.current = location.key;
    }
  }, [location.key]);
  const currentShelf = new URLSearchParams(location.search).get('shelf') ?? 'all';
  const countFor = (shelf: string) =>
    books.filter((book) => {
      const state = personal[book.id];
      if (shelf === 'all') return true;
      if (shelf === 'favorites') return state?.favorite;
      return (state?.status ?? 'want-to-read') === shelf;
    }).length;

  return (
    <div
      className="app-layout"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobileOpen) {
          setMobileOpen(false);
          document.getElementById('navigation-toggle')?.focus();
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="mobile-header">
        <Link to="/" className="wordmark">
          <BookOpen size={25} strokeWidth={1.5} />
          folio<span>.</span>
        </Link>
        <Button
          id="navigation-toggle"
          size="icon"
          variant="ghost"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls="sidebar"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>
      </div>
      <aside id="sidebar" className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <Link to="/" className="wordmark desktop-wordmark" aria-label="Folio home">
          <BookOpen size={29} strokeWidth={1.3} />
          folio<span>.</span>
        </Link>
        <p className="sidebar-subtitle">A little room for reading.</p>
        <p className="eyebrow sidebar-label">YOUR LIBRARY</p>
        <nav aria-label="Your library">
          {shelves.map(({ label, to, icon: Icon, shelf }) => (
            <Link
              key={shelf}
              to={to}
              className={`nav-item ${location.pathname === '/' && currentShelf === shelf ? 'active' : ''}`}
              aria-current={
                location.pathname === '/' && currentShelf === shelf ? 'page' : undefined
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              <span className="nav-count">{countFor(shelf)}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <nav aria-label="App settings">
          <NavLink className="nav-item" to="/settings" onClick={() => setMobileOpen(false)}>
            <Settings2 size={18} strokeWidth={1.6} />
            <span>Reading preferences</span>
          </NavLink>
          <NavLink className="nav-item" to="/admin" onClick={() => setMobileOpen(false)}>
            <Plus size={18} strokeWidth={1.6} />
            <span>Manage library</span>
            <ArrowUpRight size={14} />
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-note">
            <Leaf size={23} strokeWidth={1.2} />
            <p>
              A few pages.
              <br />A little more you.
            </p>
          </div>
          <div className="atmosphere-label">
            <span>YOUR ATMOSPHERE</span>
            <span>Aa</span>
          </div>
          <ThemePicker compact />
          <Link to="/about" className="profile-row" onClick={() => setMobileOpen(false)}>
            <span className="avatar">F</span>
            <span>
              <strong>Your reading room</strong>
              <small>Local demo · this browser</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="main-column">
        {storageError && (
          <p className="notice" role="status">
            Browser storage is unavailable. Changes will last for this visit only.
          </p>
        )}
        <main id="main-content" tabIndex={-1} key={location.pathname}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Made for the love of a good book.</span>
          <Link to="/about">
            About this demo <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
