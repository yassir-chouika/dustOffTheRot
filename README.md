# Folio — A Beautiful, Distraction-Free Reading App

> **Status:** M01 foundation implemented; M02 design system is next  
> **Working name:** Folio (rename anytime)  
> **Goal:** A personal-first, optionally invite-only web app that makes reading PDFs and EPUBs comfortable, immersive, and enjoyable—with accessible controls, gentle animations, and free read-aloud playback.

**Folio is a reading experience, not just a PDF viewer.** It combines an elegant bookshelf, two document-reading engines, personalized reading settings, optional realistic page-turning, and a browser-based text-to-speech player. The priority is reader comfort and returning to books naturally—not addictive or distracting mechanics.

> **Development guide:** See [ROADMAP.md](./ROADMAP.md) for the exact milestone order, acceptance criteria, branching strategy, suggested commit messages, and **when to push to GitHub**.

## 1. Core principles

1. **Reading first.** From opening the app to opening a book should take very few clicks.
2. **Comfort is personal.** Fonts, spacing, colors, motion, and layouts are configurable.
3. **Beautiful but calm.** Animations should communicate actions and never slow reading down.
4. **Accessible by design.** Keyboard navigation, usable focus states, contrast, responsive layouts, and a reduced-motion alternative are core requirements.
5. **Local-first mindset, cloud when useful.** Keep the initial architecture simple; add account-based sync and limited sharing with appropriate permissions.
6. **Free/open-source dependencies and no paid AI APIs.** Hosted services can start on free plans, subject to quotas and terms.
7. **Do not promise impossible conversions.** A PDF cannot always be faithfully converted into perfectly reflowable text; scanned PDFs require optional OCR later.

## 2. Who is it for?

- **Primary:** Personal reading on desktop and mobile.
- **Secondary:** A small number of invited friends with separate reading progress and preferences.
- **Admin:** The owner imports/manages books and controls which books may be shared.

The product will initially be **private or invite-only**, not a public, searchable book-distribution service.

## 3. Experience and pages

| Page / area | Planned experience |
| --- | --- |
| Welcome / Sign in | Minimal entrance for invited users; no unnecessary onboarding. |
| Library / Home | Continue Reading, All Books, Favorites, Want to Read, Finished, search, and polished cover cards. |
| Book Details | Cover, title, author, description, format, progress, and a prominent **Read** button. |
| Reader | Focused reading canvas with navigation, chapter/table-of-contents access, and configurable controls. |
| Reader Settings | Themes, font controls, page layout, animation preference, keyboard shortcuts. |
| Read-Aloud Player | Play, pause, resume, previous/next reading segment, voice, and speed. |
| Personal Shelf | Saved books, bookmarks, reading history, and progress. |
| Admin / Upload | Protected PDF/EPUB upload and metadata management; no public upload route. |

### Visual direction

- **Style:** Editorial, elegant, tactile, minimal, with generous whitespace and excellent typography.
- **Library:** Book covers, soft elevation, small hover transforms, responsive grids, subtle loading states.
- **Reader:** Content-first reading area, paper-like page surfaces, fluid transitions, controls that fade or collapse when unused.
- **Animations:** Use Motion for React for entrance/exit, book-opening, transitions, and restrained micro-interactions; prefer lightweight CSS transitions where enough.
- **Reading Atmospheres:** **Warm Paper**, **Midnight**, **Forest**, and **Classic**. The last-used selection persists per user.
- **Motion safety:** Support `prefers-reduced-motion`; avoid autoplay effects, parallax, and unnecessary movement.

## 4. Feature specification

### 4.1 Library and discovery

- Responsive bookshelf/list layouts with book cover, title, author, format, and progress.
- Continue Reading section sorted by most recently opened.
- Filter by format and shelf; search by title, author, or genre.
- Favorites; Want to Read; Reading; Finished.
- Empty, loading, and error states that look intentional.
- Admin can add/edit/remove library records and cover art; users cannot manipulate the shared collection.

### 4.2 Two reading engines

**PDF reader — powered by PDF.js**

- Render native PDF pages faithfully (including layout, tables, illustrations where supported).
- Next/previous page, page number / total, jump to page, zoom or fit-to-width.
- Single-page and optional desktop two-page display; continuous scroll.
- Keep text selection/search where the underlying PDF contains extractable text.
- Remember **page number + scroll/zoom context** as applicable.
- **Limitation:** Custom font and true reflow are not guaranteed for PDF. Text-to-speech works only when suitable text can be extracted; scanned PDFs may not support it until OCR is added.

**EPUB reader — powered by EPUB.js**

- Paginated single-page view, responsive two-page spread if supported, and continuous scrolling.
- Font family/size, line height, margins, text width, and theme controls.
- Table of contents and chapter navigation.
- Save a **CFI/EPUB location**, not a fixed physical page number. Any displayed estimated page count may change after reflow or resizing.
- EPUB embedded scripts remain disabled; do not enable arbitrary scripted book content.

**Shared reading controls**

- Escape to leave reader; left/right arrows for page navigation when appropriate.
- On-screen controls and swipe support on touch devices.
- Fullscreen or distraction-free focus mode; quick access to progress and current chapter.
- Restore the correct position after refresh and across supported devices.

### 4.3 Reading comfort and inclusive design

- Choice of readable fonts and optional alternative fonts, not a single supposedly universal “dyslexia font.”
- Adjustable font size, line-height, paragraph spacing, page width, and contrast **where text is reflowable**.
- Optional reading ruler/line or paragraph highlight (start with reflowable text).
- Short voluntary reading-session timers: 5, 10, 15 minutes; no guilt-based streak notifications.
- Reduced-motion mode and option to disable the realistic page-flip effect.
- Visible focus states, screen-reader labels, proper headings, and keyboard reachability.
- Respect browser zoom; test usability on mobile, tablet, and desktop.

### 4.4 Realistic page-turn animation

- Investigate **StPageFlip** for fixed-size HTML pages or pre-rendered PDF page surfaces.
- Experiment with the cover-opening transition and desktop page-turn effect.
- Make the animation **optional** and only enable it where compatible and performant.
- Provide an immediate non-animated next/previous-page fallback.
- **Important technical spike:** EPUB.js uses its own rendition/layout system; integrating reflowable EPUB pages directly into StPageFlip is nontrivial. Do not assume universal page flips until a small proof-of-concept succeeds. Accessibility and navigation take precedence over 3D effects.

### 4.5 Read-aloud / text-to-speech (not stored audiobooks)

- Use the browser **Web Speech API** initially; no paid TTS service.
- Play, pause, resume, stop, change voice and language when available, and speed (e.g. 0.75×–1.5×).
- Previous/next **text segment** rather than imprecise audio seeking; track where reading stopped.
- Optionally highlight current sentence/paragraph when the selected browser/voice supports useful boundary events.
- Set correct language and pronounce text from the appropriate chapter/section.
- Gracefully handle missing voices, unsupported browsers, speech errors, app navigation, and unextractable PDFs.
- Voice quality and some timing/highlight features vary by OS/browser. Browser-native voices may be device-based or browser/service-provided; offline availability is not guaranteed.

### 4.6 Progress, notes, and personal shelves

- Store one reading-progress record per `(user, book)`.
- Auto-save with sensible debouncing and save again on navigation/reader exit.
- EPUB: store CFI/location + percentage if available. PDF: page index and optional within-page offset.
- Bookmark a page/EPUB location; open a bookmark to return there.
- Support favorite / reading status per user.
- Later: highlights and personal notes with per-format location anchors.
- Never expose someone else's bookmarks, notes, or reading activity.

### 4.7 Admin-only book importing

1. Admin selects a PDF or EPUB and optionally a cover image.
2. Validate file type, actual file signature where feasible, size, and permissions.
3. Upload binary to **object storage** (not as a binary blob inside PostgreSQL).
4. Extract metadata when available: title, author, format, page count/TOC; allow manual correction.
5. Store book metadata and storage path in the database.
6. Create/publish the book record only after upload succeeds, or roll back/clean up on failure.
7. The library refreshes automatically so permitted readers see the new book.
8. Admin can edit metadata, replace files, unpublish, or remove a book with confirmation.

## 5. Chosen technology stack

| Layer | Choice | Purpose |
| --- | --- | --- |
| UI | **React + Vite + TypeScript** | Fast, client-side app; straightforward deployment and maintenance. |
| CSS | **Tailwind CSS** | Responsive layouts, tokens, theme styles. |
| Components | **shadcn/ui** (selected components only) | Accessible, customizable primitives without visual lock-in. |
| Navigation | **React Router** | Routes for library, books, reader, admin, settings. |
| Animation | **Motion for React** (`motion`) | Transitions, small interactions, cover opening. |
| Page-turn effect | **StPageFlip** (`page-flip`) | Optional, tested progressive enhancement. |
| PDF | **PDF.js** (`pdfjs-dist`) | Render and navigate fixed-layout PDF. |
| EPUB | **EPUB.js** (`epubjs`) | Render reflowable EPUB and track CFI positions. |
| Speech | **Web Speech API** | Free browser read-aloud functionality. |
| Backend | **Supabase** | Managed PostgreSQL, auth, and object storage; free-tier start. |
| Data access | **supabase-js** | Client API with RLS enforced in backend policies. |
| Server state | **TanStack Query** (optional, adopt when needed) | Cache/refresh library and progress data. |
| Forms / validation | **React Hook Form + Zod** (when admin forms arrive) | Clear validation and reusable form behavior. |
| Tests | **Vitest + Testing Library + Playwright** | Unit/component/E2E coverage. |
| Deploy | **Vercel** for Vite frontend | Simple personal project hosting and preview builds. |
| CI | **GitHub Actions** | Lint, typecheck, unit tests, build, selected E2E checks. |

**No Prisma or Next.js in version 1:** Supabase plus a Vite SPA is enough. Avoid maintaining a separate server until a genuine need appears. Privileged admin operations should still be enforced server-side with policies and trusted functions, not just hidden UI controls.

**Current service constraints to recheck before hosting:** The Supabase free plan currently advertises 1 GB file storage, 500 MB database, and a **50 MB max single file upload**. Free quotas and hosting policies can change. PDFs are often large; set suitable upload errors and test with a small authorized sample book.

## 6. Proposed architecture

```text
Reader browser (React + Vite)
  ├── Library / book details / admin UI
  ├── Reader shell + settings + progress
  │     ├── PDF adapter  -> PDF.js
  │     └── EPUB adapter -> EPUB.js
  ├── Optional animation layer -> Motion + StPageFlip spike
  ├── Read-aloud service -> Web Speech API
  └── Supabase client (public anon key only)
           ├── Auth (user sessions)
           ├── Postgres (metadata, progress, shelves, prefs)
           ├── Storage (private book objects, covers as appropriate)
           └── RLS / trusted server functions for authorization
```

**Security model:**
- Use private book-file buckets by default and enforce authenticated read permissions. A signed URL is temporary access, not DRM and not permission to redistribute a book.
- Only admin users may create/update/delete books and upload library files. This **must** be enforced in RLS and storage policies, not by a frontend `isAdmin` flag.
- Store admin roles in trusted backend-controlled data; normal users cannot change their own role.
- Each reader can read/write only their **own** progress, bookmarks, notes, and preferences.
- Never put a `service_role` key, private credentials, or database secrets in Vite/client-side environment variables. `VITE_` values are public to clients.
- Keep any copyrighted book files out of the Git repository, public demo, and shared test fixtures.
- Confirm the rights to distribute a book before sharing it with friends. Owning an e-book is not automatically redistribution permission.
- Sanitize imported EPUB content, disable untrusted EPUB scripting, and treat files/metadata as untrusted input.

## 7. Proposed data model

This is a planning sketch rather than finalized SQL:

| Table | Key fields | Notes |
| --- | --- | --- |
| `books` | `id`, `title`, `author`, `description`, `format`, `storage_path`, `cover_path`, `language`, `genre`, `is_published`, `created_at` | Shared catalog; admin-managed. |
| `profiles` | `user_id`, `display_name`, `role`, `created_at` | Auth-linked; role is protected. |
| `reading_progress` | `user_id`, `book_id`, `locator_type`, `locator`, `percentage`, `last_read_at` | Composite unique key `(user_id, book_id)`. |
| `bookmarks` | `id`, `user_id`, `book_id`, `locator_type`, `locator`, `label`, `created_at` | Personal. |
| `user_books` | `user_id`, `book_id`, `shelf_status`, `is_favorite`, `updated_at` | Personal shelves and favorites. |
| `reader_preferences` | `user_id`, `theme`, `font_family`, `font_size`, `line_height`, `margin`, `layout`, `reduced_motion`, `tts_rate` | Typed/range-validated. |
| `annotations` | `id`, `user_id`, `book_id`, `locator`, `quote`, `note`, `created_at` | Post-MVP; personal highlights/notes. |

For EPUB, the locator is typically an **EPUB CFI**; for PDFs, a **page index** and optionally position within that page. Do not store a single generic `page_number` field and expect it to work for both formats.

## 8. Planned source layout

```text
folio/
├── README.md
├── ROADMAP.md
├── .env.example
├── .gitignore
├── public/
│   └── ... (app-owned static assets only)
├── src/
│   ├── app/                 # Routing, providers, global app shell
│   ├── components/
│   │   ├── ui/              # Shared design primitives
│   │   └── layout/          # Navbar, sidebar, dialogs
│   ├── features/
│   │   ├── library/         # Book cards, lists, filters
│   │   ├── books/           # Book details and metadata
│   │   ├── reader/          # Reader shell, controls, adapters
│   │   ├── audio/           # TTS controls and speech hooks
│   │   ├── progress/        # Progress, bookmarks, shelves
│   │   ├── settings/        # Typography and themes
│   │   └── admin/           # Protected import / edit flow
│   ├── lib/                 # Supabase client, utilities, validation
│   ├── styles/              # Tailwind and design tokens
│   ├── types/               # Shared TypeScript contracts
│   └── test/                # Fixtures and test utilities
├── supabase/
│   └── migrations/          # Versioned database schema and RLS policies
├── tests/
│   └── e2e/
└── .github/
    └── workflows/
        └── ci.yml
```

Keep components near the feature that owns them. Avoid giant components that combine parsing, speech, animation, data fetching, and UI in one place.

## 9. Version 1 scope and what can wait

**Version 1 (ship first):**
- Beautiful, responsive library with working search and book details.
- Sign-in + invite-only access; admin-only uploads.
- Working PDF and EPUB readers with navigation and basic layout settings.
- Reading Atmospheres, focus mode, progress restoration, bookmarks, and personal shelves.
- Browser read-aloud for extractable text.
- Calm transitions and optional, proven page-turn effect (do not block launch on it).
- Good error handling, keyboard access, unit/E2E tests, and a working demo with only distributable sample books.

**Later improvements:**
- Offline reading/PWA and optional local file imports.
- Robust PDF text reflow or OCR for scanned documents.
- High-quality self-hosted TTS if browser voices are insufficient.
- Per-book highlights/notes, cross-device conflict resolution, reading statistics, export/import of personal data.
- Additional formats, recommendations, collaborative features (only if actually needed).

**Non-goals:** Social feeds, leaderboards, forced streaks, paywalled libraries, paid APIs, and guaranteed conversion of every PDF into perfect responsive text.

## 10. Local setup

Use **Node 24 LTS** (see `.nvmrc`; Node 22.12+ LTS is also supported). Node 26 is not supported by the current test environment.

```bash
nvm use
npm ci
npm run dev
```

Vite serves the app at `http://127.0.0.1:5173`. The foundation includes a responsive navigation shell and routes for `/`, `/books/:id`, `/read/:id`, `/settings`, `/admin`, and `/about`, plus a not-found fallback. Four atmosphere previews and the reduced-motion preference persist in this browser. Library, book detail, reader, and admin screens are explicitly marked development placeholders. The seeded catalog is fictional metadata, with no attached book files.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
# Browser setup, once:
npx playwright install chromium
npm run test:e2e
```

The browser smoke tests run desktop Chromium and a mobile viewport. They verify navigation, local preference persistence after reload, no horizontal overflow, and no uncaught page errors. A mobile viewport is not a substitute for testing on a real phone. The existing `vercel.json` supplies SPA rewrites; no deployment is configured or published yet.

### Connected services

On November 1, 2026, the Supabase plugin verified access to project `sxdhsvmszqbsybblfntv` (Folio, `ACTIVE_HEALTHY`). Its `public` schema had no application tables. The GitHub plugin verified access to `yassir-chouika/dustOffTheRot`.

No Supabase credentials are required to run this foundation. Authentication, schema/RLS, storage, and the Supabase client are **not wired yet**; they are planned for M04 after the mock library milestones. Existing `.env.local` contents are preserved and ignored. Never commit secrets or use a service-role/secret key in a `VITE_` variable.

Planned public client configuration (`.env.example` contains placeholders):

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Public client keys require appropriate RLS and storage policies before backend access is enabled. Install additional packages only in milestones that use them; the starting scaffold already included some future reader/backend dependencies.

## 11. Quality and definition of done

Before marking a milestone complete:

- [ ] Relevant acceptance criteria in [ROADMAP.md](./ROADMAP.md) pass.
- [ ] `typecheck`, `lint`, `test`, and `build` pass **once those scripts exist**.
- [ ] New user-visible features are keyboard-accessible and responsive.
- [ ] Loading, empty, error, and permission-denied states are handled.
- [ ] No secrets, copyrighted book binaries, or generated uploads are committed.
- [ ] Necessary tests or written manual test steps accompany the change.
- [ ] Commit messages explain cohesive changes; the branch is pushed and merged before the next milestone.

## 12. License and rights

- **App source license:** To be chosen by the owner before public release (MIT is an option). Do not add a license accidentally without deciding.
- **Third-party libraries:** Keep required notices and review individual package licenses.
- **Book content:** Each book retains its own copyright/license. Open-sourcing the app **does not** grant rights to distribute uploaded books.
- **Demo content:** Use expressly licensed or locally public-domain texts and verify the copyright status for the territory where they are distributed.

## 13. Learning and reference links

- [Vite](https://vite.dev/guide/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui](https://ui.shadcn.com/)
- [Motion for React](https://motion.dev/docs/react)
- [StPageFlip](https://github.com/Nodlik/StPageFlip)
- [PDF.js](https://mozilla.github.io/pdf.js/getting_started/)
- [EPUB.js](https://github.com/futurepress/epub.js)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Supabase Storage security](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase pricing](https://supabase.com/pricing)
- [Playwright](https://playwright.dev/)

---

**Next action:** Follow **M00 → M01** in [ROADMAP.md](./ROADMAP.md), start with a clean repository, and make your first meaningful documentation commit.
