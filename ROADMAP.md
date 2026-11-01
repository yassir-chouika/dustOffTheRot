# Folio — Development Roadmap, Milestones & GitHub Workflow

> A build plan for one developer. Complete one milestone at a time. **Every milestone ends with a verified push**, and ideally a merged pull request. Avoid arbitrary daily commit quotas—commit when a coherent piece of work is finished.

**Current status:** M01 foundation implemented and validated; M02 is next. Service access verified; backend integration begins at M04.  
**Target v1:** Invite-only library, admin PDF/EPUB imports, usable readers, progress + shelves, comfortable themes/accessibility, read-aloud, testing, and a deployable demo.  
**Working stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Motion; PDF.js and EPUB.js; Supabase Postgres/Auth/Storage; optional StPageFlip; Web Speech API; Vitest, Testing Library, Playwright, GitHub Actions; Vercel.

## 0. Git rules — read this first

### Branching strategy

- `main` = always stable, passes existing checks, is deployable when deployment is configured.
- `feat/...` = one feature/milestone; `fix/...` = bugfix; `docs/...` = documentation-only work.
- Branch names are descriptive: `feat/reader-pdf`, `feat/admin-import`, `feat/tts`.
- Create a pull request for each completed milestone. Review the diff yourself, run tests, then merge it.
- Never start a new milestone from a stale feature branch. Return to `main`, pull, and create a fresh branch.

### Exactly when to commit / push

1. **Commit when one coherent unit works**, e.g. a styled book card, a protected upload policy, or successful PDF navigation. Usually **2–4 focused commits per milestone**; more if the milestone naturally needs them.
2. **Push the feature branch after a milestone passes its definition of done.** This is the mandatory push checkpoint.
3. **Push your branch earlier if switching computers, ending a long work session, or needing a safe backup.** Work-in-progress pushes are fine on a feature branch; use meaningful work-in-progress commits or a clearly labeled draft PR.
4. **Merge the PR**, then update your local `main`. GitHub has the merged `main` as soon as the PR is merged; you do not need to push `main` again if it was merged on GitHub.
5. **Tag releases** at a finished version (`v0.1.0`, `v0.2.0`, `v1.0.0`) rather than tagging every commit.

**Never commit:** `.env.local`, secret keys/tokens, actual uploaded book files, user-private data, `node_modules`, compiled `dist`, and copyrighted sample books without permission.

### First repository push (M00)

If the GitHub repository is newly created and empty:

```bash
# From your initial project folder containing README.md and ROADMAP.md
git init
git branch -M main
git add README.md ROADMAP.md
git commit -m "docs: define Folio vision and implementation roadmap"
git remote add origin <YOUR_GITHUB_REPOSITORY_SSH_OR_HTTPS_URL>
git push -u origin main
```

If `git init`, `origin`, or `main` already exists, **do not recreate/reset them**. Check with `git status`, `git branch`, and `git remote -v`, then adapt the workflow. Switching remote protocol never requires undoing staged files or commits. SSH keys are device-specific; HTTPS remains a valid alternative.

### Workflow for every later milestone

```bash
# Replace <milestone-branch> with the branch in that milestone.
git switch main
git pull --ff-only origin main
git switch -c feat/<milestone-branch>

# Work in small coherent units; at each natural checkpoint:
git status
git add <specific-files-or-folders>
git commit -m "feat: describe the working change"

# When ready to back up or show progress:
git push -u origin feat/<milestone-branch>

# Run relevant checks. Open and merge a PR on GitHub.
# After merge:
git switch main
git pull --ff-only origin main
```

Subsequent pushes from the same tracked feature branch can use just `git push`. If you're working on multiple devices, run `git pull --ff-only` on the correct branch before making new changes. Don't force-push shared branches casually.

### Useful conventional commit prefixes

`feat:` new behavior · `fix:` bug fix · `refactor:` code improvement without behavior change · `test:` tests · `docs:` documentation · `style:` visual-only changes · `chore:` tooling/configuration · `perf:` performance.

### Minimum pre-push checklist

- [ ] The change works manually in the browser.
- [ ] Typecheck, lint, tests, and build pass (where configured).
- [ ] UI works on desktop and phone size; keyboard navigation doesn't break.
- [ ] Any database/storage policies were checked with **both** admin and regular-user roles.
- [ ] No sensitive keys, personal documents, or copyrighted book binaries appear in the diff.
- [ ] Commit messages are descriptive, and the PR explains what changed.

---

## Milestone overview and mandatory push points

| ID | Phase | Branch | Deliverable | Push checkpoint |
| --- | --- | --- | --- | --- |
| M00 | Plan | `main` or `docs/project-plan` | Vision + roadmap in GitHub | **Push #1** after documentation commit |
| M01 | Foundation | `feat/app-foundation` | Vite app, tooling, basic tests | **Push #2** after successful build |
| M02 | Design | `feat/design-system` | Tokens, themes, layout shell | **Push #3** after responsive shell |
| M03 | Library UI | `feat/library-ui` | Mock bookshelf, book details, navigation | **Push #4** after usable mock journey |
| M04 | Data/auth | `feat/supabase-foundation` | Schema, auth, RLS, storage setup | **Push #5** after security tests |
| M05 | Book import | `feat/admin-import` | Protected PDF/EPUB upload + metadata | **Push #6** after import success |
| M06 | PDF reader | `feat/pdf-reader` | Real PDF rendering, navigation | **Push #7** after PDF smoke tests |
| M07 | EPUB reader | `feat/epub-reader` | Reflowable EPUB, TOC, modes | **Push #8** after EPUB smoke tests |
| M08 | Personal data | `feat/reading-progress` | Continue Reading, progress, shelves, bookmarks | **Push #9** after reload/device test |
| M09 | Comfort/accessibility | `feat/reading-preferences` | Themes, typography, focus, reading guide, timers | **Push #10** after accessibility checks |
| M10 | Animation | `feat/reading-motion` | Smooth transitions and optional page-flip POC | **Push #11** after fallback works |
| M11 | Read-aloud | `feat/read-aloud` | Voice, playback, segment controls | **Push #12** after browser tests |
| M12 | Quality & release | `feat/release-prep` | Tests, CI, security review, docs, deployment | **Push #13** and tag `v1.0.0` after release |

**Tip:** A push is not a substitute for a commit. For each milestone, make a small number of useful commits; push the branch once the milestone is complete, plus optional backup pushes during long work.

---

## PHASE 0 — Plan and foundation

### M00 — Document the project and create the repository

**Goal:** Start clean with an agreed scope and a usable public/private GitHub repository.

Tasks:
- [ ] Choose a repository name (`folio` is a working suggestion) and short description.
- [ ] Add `README.md` and `ROADMAP.md` to the repository root.
- [ ] Choose public vs private repository. Keep actual books and credentials out of Git either way.
- [ ] Create an initial GitHub repository and verify `git remote -v`.
- [ ] Decide whether initial demo samples are rights-cleared public-domain/explicitly licensed works.
- [ ] List a short definition of success: a new invited reader can open a book, resume, adjust display, and listen where text is available.

**Acceptance:** Repo contains readable documentation, `main` exists, and the remote is reachable.

**Suggested commit:** `docs: define Folio vision and implementation roadmap`

**PUSH #1:** `git push -u origin main` (new repo only). Do this **now**, before writing app code.

### M01 — Bootstrap React + Vite + TypeScript

**Goal:** Running development app with consistent scripts and a basic test.

Tasks:
- [x] Scaffold Vite React TypeScript without nesting another unwanted Git repository.
- [x] Add Tailwind CSS and minimal app styles.
- [x] Configure ESLint, Prettier, strict TypeScript, import/path conventions, and `.gitignore`.
- [x] Add React Router placeholder routes: `/`, `/books/:id`, `/read/:id`, `/settings`, `/admin`.
- [x] Add Vitest + React Testing Library with one passing app-shell smoke test.
- [x] Provide scripts such as `dev`, `build`, `preview`, `typecheck`, `lint`, `test`.
- [x] Add `.env.example`; exclude `.env.local`, `dist`, `node_modules`, and upload folders.

**Acceptance:** App launches; typecheck/lint/test/build succeed; no secret or real e-book in Git.

**Example commits:**
- `chore: initialize Vite React TypeScript application`
- `chore: configure Tailwind lint formatting and test scripts`
- `test: add app shell smoke test`

**PUSH #2:** Push `feat/app-foundation` after all checks pass; open PR and merge into `main`.

---

## PHASE 1 — Beautiful library prototype (mock data first)

### M02 — Design system and responsive app shell

**Goal:** Establish the app's visual identity before building complex backend logic.

Tasks:
- [ ] Define colors, background surfaces, radii, shadows, type scale, spacing, and motion durations.
- [ ] Add selected shadcn/ui components (button, dialog, dropdown, tabs, input, slider as needed).
- [ ] Implement navigation / header and responsive layout.
- [ ] Build **Warm Paper / Midnight / Forest / Classic** theme previews with CSS variables.
- [ ] Create skeleton, empty, error, and loading styles.
- [ ] Add keyboard-visible focus, contrast checks, and `prefers-reduced-motion` support.

**Acceptance:** Shared shell looks intentional on narrow and wide screens; theme switching works locally.

**Example commits:**
- `style: establish Folio color tokens and typography`
- `feat: add responsive navigation and theme switcher`
- `test: cover theme switching behavior`

**PUSH #3:** Push `feat/design-system`, review screenshots, PR, merge.

### M03 — Functional library UI with seeded mock books

**Goal:** An attractive end-to-end UI without backend complexity.

Tasks:
- [ ] Create typed `Book` UI models and **fictional/mock metadata**, not actual copyrighted files.
- [ ] Build CoverCard, BookGrid, ContinueReading, shelf tabs, search and genre/format filters.
- [ ] Build book detail page with metadata, author, description, format, and Read action.
- [ ] Add empty collection, search-no-results, loading, and not-found states.
- [ ] Test keyboard navigation of cards, responsive grids, and clickthrough routes.
- [ ] Keep seeded data isolated behind a data-access interface so Supabase can replace it.

**Acceptance:** User can browse/search books, open details, and navigate to a reader placeholder.

**Example commits:**
- `feat: build book cards and responsive library grid`
- `feat: add book details and search filters`
- `test: cover library navigation and empty states`

**PUSH #4:** Push `feat/library-ui`, PR, merge. Optional release tag `v0.1.0` for the UI prototype.

---

## PHASE 2 — Real data and protected book import

### M04 — Supabase schema, authentication, and RLS

**Goal:** Replace mocks with a secure data foundation.

Tasks:
- [ ] Create Supabase project and configure public client URL/key via `.env.local`.
- [ ] Add schema migrations for `books`, `profiles`, `reading_progress`, `bookmarks`, `user_books`, `reader_preferences`.
- [ ] Connect Supabase Auth; choose invite-only account provisioning for your small audience.
- [ ] Create **trusted admin role**. Do not let normal users update their role themselves.
- [ ] Enable Row Level Security on every user-facing table and implement least-privilege policies.
- [ ] Create private `books` storage bucket and safe cover storage policy.
- [ ] Ensure authenticated readers can read only permitted published books; only admins modify shared books.
- [ ] Test access with **two actual test identities**: admin and ordinary reader.
- [ ] Document login, auth redirects, session expiration, and RLS migration approach.

**Acceptance:** Ordinary users cannot add/delete books, alter roles, or read/write other users' private data. Unauthorized users cannot fetch protected book objects. Signed access should expire as intended.

**Example commits:**
- `feat: add Supabase schema and authentication`
- `feat: enforce admin and reader RLS policies`
- `test: verify role-based data access`

**PUSH #5:** Push `feat/supabase-foundation` **only after permission tests**, PR, merge.

### M05 — Admin upload and catalog publishing

**Goal:** Import a legal PDF/EPUB once; it appears automatically for readers.

Tasks:
- [ ] Create protected `/admin` dashboard with add/edit/unpublish/delete actions.
- [ ] Accept `.pdf` and `.epub` with MIME/signature/size checks; show upload progress.
- [ ] Check file size against current free-tier restrictions before upload; show specific error if too large.
- [ ] Upload binary to private storage, store only the storage path in `books`.
- [ ] Read basic metadata from the file or allow manual title/author/description/cover entry.
- [ ] Clean up temporary/orphaned files if database insertion fails.
- [ ] Ensure successful publication triggers a library refresh.
- [ ] Test replacement/removal safely; explain that existing reader progress may need handling when replacing a file.

**Acceptance:** Admin imports at least one authorized PDF and EPUB. Both appear in library; normal reader cannot access admin operations; failed upload does not create a broken book entry.

**Example commits:**
- `feat: add protected book upload form`
- `feat: persist book files and catalog metadata`
- `test: cover upload validation and permissions`

**PUSH #6:** Push `feat/admin-import`, PR, merge.

---

## PHASE 3 — Core reading engines

### M06 — Native PDF reading

**Goal:** Read real PDFs without relying on the browser's default PDF iframe viewer.

Tasks:
- [ ] Implement reusable `ReaderShell` with fullscreen/focus navigation placeholders.
- [ ] Add `PdfReader` adapter using PDF.js with worker configuration.
- [ ] Render on-demand pages, handle previous/next, jump-to-page, page count, and zoom/fit width.
- [ ] Add scroll/single-page layout and optional two-page desktop view.
- [ ] Handle invalid files, pages with images, loading, large files, and text selection as supported.
- [ ] Expose extractable text to the future read-aloud interface.
- [ ] Test desktop and mobile page navigation with a rights-cleared sample PDF.

**Acceptance:** PDF renders with correct pages/page numbers, supports navigation, doesn't freeze on an ordinary sample, and has graceful fallback when text extraction is impossible.

**Example commits:**
- `feat: implement PDF.js reader adapter`
- `feat: add PDF navigation zoom and reader controls`
- `test: verify PDF loading and navigation`

**PUSH #7:** Push `feat/pdf-reader`, PR, merge.

### M07 — EPUB reading and responsive typography

**Goal:** Provide the more comfortable reflowable book experience.

Tasks:
- [ ] Add `EpubReader` adapter using EPUB.js with safe sandboxed content.
- [ ] Support paginated/single-page, two-page where possible, and scrolling layouts.
- [ ] Add chapter/TOC navigation and prev/next reading-section controls.
- [ ] Add font size, line height, width, and margins for reflowable content.
- [ ] Capture EPUB CFI/location; do not treat positions as fixed PDF page numbers.
- [ ] Keep untrusted scripts disabled; test content with images and varying chapter lengths.
- [ ] Establish common `ReaderAdapter` interface while preserving format-specific capabilities.

**Acceptance:** A permitted EPUB opens, renders responsively, changes typography without losing readability, and reports a stable location for progress storage.

**Example commits:**
- `feat: implement EPUB.js reader adapter`
- `feat: add EPUB pagination TOC and typography controls`
- `test: cover EPUB navigation and reading positions`

**PUSH #8:** Push `feat/epub-reader`, PR, merge. Optional tag `v0.2.0` for the fully working two-format reader.

---

## PHASE 4 — Reading comfort and persistence

### M08 — Progress, shelves, favorites, and bookmarks

**Goal:** Reading feels continuous across visits and permitted devices.

Tasks:
- [ ] Persist user/book position for EPUB (CFI) or PDF (page index + optional offset).
- [ ] Debounce auto-save; save reliably on reader exits and critical navigation events.
- [ ] Add Continue Reading sorted by `last_read_at`.
- [ ] Add per-user Want to Read, Reading, Finished, and Favorites.
- [ ] Add/create/remove bookmarks and navigate directly to saved locations.
- [ ] Handle missing/unpublished books and missing/invalid stored locators.
- [ ] Test that user A cannot read user B's progress/bookmarks.
- [ ] Test resume after refresh and sign-in on a second device.

**Acceptance:** Readers reliably resume an authorized book; shelves and bookmarks persist; user data remains private.

**Example commits:**
- `feat: persist reading progress per book and user`
- `feat: add personal shelves favorites and bookmarks`
- `test: validate progress restoration and privacy`

**PUSH #9:** Push `feat/reading-progress`, PR, merge.

### M09 — Reading Atmospheres, focus, and accessibility

**Goal:** Make reading genuinely comfortable for different preferences.

Tasks:
- [ ] Persist Warm Paper, Midnight, Forest, Classic themes and per-user preferences.
- [ ] Add reader typography (where supported), page width, margins, and optional single-/two-page preference.
- [ ] Add Focus Mode hiding nonessential controls but keeping navigation discoverable.
- [ ] Add optional line/paragraph guide for compatible reflowable content.
- [ ] Add optional short session timer without streak pressure or forced interruptions.
- [ ] Keyboard navigation: accessible buttons/menus, logical tab order, Escape, arrows where appropriate.
- [ ] Reduced-motion compatibility, readable contrast, semantic labels, screen-reader checks.
- [ ] Document which preferences **cannot** alter original PDF typography.

**Acceptance:** Settings persist; reduced motion works; the reader remains fully usable without animations and with a keyboard; PDF limitations are clear.

**Example commits:**
- `feat: add persistent reading atmospheres and typography`
- `feat: build focus mode reading guide and session timer`
- `test: add accessibility and preferences checks`

**PUSH #10:** Push `feat/reading-preferences`, PR, merge.

---

## PHASE 5 — Delight, responsibly

### M10 — Book-opening motion and optional page flip

**Goal:** Add polish without compromising performance or text access.

Tasks:
- [ ] Add Motion for React transitions for library cards, details, reader entry/exit, and small UI actions.
- [ ] Ensure animations are restrained, cancelable, and disabled under reduced motion.
- [ ] **Technical spike:** Try StPageFlip with pre-rendered fixed PDF pages or compatible HTML page surfaces.
- [ ] Assess if a page flip remains selectable, navigable, readable, and responsive.
- [ ] Test a prototype with EPUB content; if it fights EPUB.js reflow/pagination, **do not ship this coupling**.
- [ ] Add a reader toggle to disable realistic page turns; instant navigation must always remain available.
- [ ] Check memory/performance; avoid rendering an entire large PDF into page-turn canvases at once.

**Acceptance:** Reader transitions look polished, reduced-motion fallback works, and optional page-turn effects never block reading. If page flip is technically unsound, record findings and ship simple transitions instead.

**Example commits:**
- `feat: add calm library-to-reader transitions`
- `feat: prototype optional fixed-page turn animation`
- `perf: optimize reader animations and motion fallback`

**PUSH #11:** Push `feat/reading-motion` after a documented go/no-go decision, PR, merge.

### M11 — Built-in read-aloud and listening controls

**Goal:** Read aloud supported book text without a paid speech API.

Tasks:
- [ ] Implement a `SpeechService` wrapper around the Web Speech API; clean up speech on reader exit.
- [ ] Segment accessible text by paragraph/sentence, handling language and headings.
- [ ] Build play/pause/resume/stop + previous/next segment; do not pretend to support reliable arbitrary audio seeking.
- [ ] Add voice picker (where voices are available) and rate controls.
- [ ] Add optional current-text highlighting, gracefully skipping it if boundary events are inaccurate or unsupported.
- [ ] Connect EPUB text; support PDF text only when meaningful extraction is available.
- [ ] Handle missing voice, permission/browser differences, errors, interruptions, and end of chapter.
- [ ] Test at least Firefox and a Chromium-based browser; test mobile if feasible.

**Acceptance:** Reader can start, pause, resume, change rate, skip text segments, and stop speech; unsupported material displays an honest explanation.

**Example commits:**
- `feat: add browser speech service and playback controls`
- `feat: connect EPUB text and extractable PDF text to TTS`
- `test: cover speech state and unavailable-voice fallback`

**PUSH #12:** Push `feat/read-aloud`, PR, merge.

---

## PHASE 6 — Test, deploy, document, release

### M12 — Finish the product, create CI, deploy v1

**Goal:** Share a stable, secure demo with a small invited audience.

Tasks:
- [ ] Add/update unit tests for data adapters, progress locators, admin validations, library filters, and TTS state.
- [ ] Add Playwright E2E flows: sign-in; catalog; authorized upload; PDF open; EPUB open; save/resume; theme selection; blocked normal-user admin access.
- [ ] Test with small authorized EPUB/PDF fixtures (including a PDF with non-extractable text as a negative case).
- [ ] Test desktop/mobile breakpoints, keyboard navigation, reduced motion, loading/error states, and offline/network failures.
- [ ] Review RLS and storage policies, including direct API attacks performed from test accounts (not just hidden buttons).
- [ ] Add GitHub Actions for lint, typecheck, tests, and production build; optionally run E2E with test-only secrets.
- [ ] Verify no private keys or uploaded/copyrighted book binaries are tracked in Git.
- [ ] Deploy frontend to Vercel (or another suitable free static host); configure Vite SPA route rewrites so direct reader URLs load.
- [ ] Set deployment environment variables; **never** deploy service-role keys to the browser.
- [ ] Update README with actual screenshots, the real demo link, real setup steps, limitations, and credits **after** they exist.
- [ ] Record browser compatibility, file size limits, and manual backup/export plan.
- [ ] Invite a small testing group and fix high-priority defects before publishing a stable release.

**Acceptance:** CI passes, app runs at a real deployed URL, invited readers can use it, upload is admin-only, and docs describe the working app rather than only the proposed app.

**Example commits:**
- `test: cover core reading and admin journeys`
- `ci: validate pull requests and production builds`
- `fix: resolve release accessibility and performance issues`
- `docs: add setup screenshots and verified demo link`

**PUSH #13:** Push `feat/release-prep`, open PR, merge when checks are green. Tag the verified commit:

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.0.0 -m "Folio v1.0.0"
git push origin v1.0.0
```

---

## After v1 — optional milestones (do not block release)

### M13 — Offline/PWA + local files
- [ ] Explore service-worker app shell caching and permitted local file reading.
- [ ] Respect user privacy, storage quotas, offline licensing, and cached-content removal.
- [ ] Resolve syncing conflicts before claiming full offline-to-cloud synchronization.
- [ ] Keep offline book files out of public caches when not authorized.
- **Push:** `feat/offline-reading`, PR, merge once robust; consider `v1.1.0`.

### M14 — Advanced accessibility and content support
- [ ] Notes and highlights with durable locators.
- [ ] Optional PDF OCR/reflow research, explicitly acknowledging fidelity and cost/performance limits.
- [ ] Optional better locally hosted TTS after measuring browser voice limitations.
- [ ] Search within a book; multilingual improvements.
- **Push:** One focused feature branch per coherent enhancement; release tag after testing.

---

## Recommended testing matrix

| Topic | Essential checks |
| --- | --- |
| Permissions | Anonymous vs invited reader vs admin, including direct database/storage attempts. |
| PDF | Text PDF, images/diagrams, large page count, corrupt PDF, scanned PDF without text. |
| EPUB | Short/long chapters, footnotes, images, reflow, TOC, changing text size. |
| Progress | Refresh, sign-out/in, second device, opening an unpublished book. |
| Reader UX | Keyboard-only navigation, touch gestures, small screens, zoom, reduced motion. |
| Speech | No voices available, changing voices/rate, pause/resume, navigation away, unextractable text. |
| Quality | Clean console, responsive loading states, failed network request, correct error feedback. |

## Commit quality examples

**Good**
```text
feat: render PDF pages with prev/next navigation
feat: persist EPUB reading position using CFI
fix: prevent non-admin users from uploading library files
test: verify bookmark restoration after reload
```

**Avoid**
```text
update
changes
fix stuff
final final
```

You **do not** need a new commit every time you change a CSS class. But do not bundle an unrelated database migration, page design, and speech engine into one giant commit either.

## Weekly routine (optional—not a strict deadline)

- Start: check `main`, choose **one milestone** and write the acceptance checklist.
- Work: make coherent commits, run tests, and push at a safe checkpoint if switching machines.
- Finish milestone: run checks, push branch, open PR, merge into `main`.
- Update: tick completed roadmap boxes and add a short note to PR/release notes.
- Do not move to the next feature until the last milestone is stable.

## Summary: exact push cadence

**13 mandatory pushes/checkpoints from M00 through M12** (one at the end of each milestone). These are *checkpoints*, not a claim that you'll make exactly 13 Git pushes total. You can safely push a working branch more often when it helps. The goal is a clear, professional Git history, not an arbitrary commit count.

**Start now:** M00 docs push → M01 scaffold → M02 visual foundation → M03 library UI. Having the first three working UI milestones will make the project feel real before tackling the document engines and backend.

## Verified foundation checkpoint — November 1, 2026

The existing partial scaffold was preserved and completed with the entry point, app routes, base styles, atmosphere controls, fallback screens, and tests. Typecheck, lint, six component smoke tests, production build, formatting, and desktop/mobile Chromium smoke checks pass on Node 24 LTS. Library and reader routes remain placeholders. No book binaries, credentials, or uploaded files are included.

Supabase plugin access to `sxdhsvmszqbsybblfntv` is healthy; the public schema is empty. GitHub access to `yassir-chouika/dustOffTheRot` is verified. M00 documentation was saved to the initially empty repository before the M01 branch. Sample-distribution rights and the app source license remain owner decisions before release. No account setup action is required for M01.
