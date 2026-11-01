-- Membership is provisioned by the owner through a trusted connection.
-- Public clients cannot create profiles, approve membership, or change roles.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  role text not null default 'reader' check (role in ('reader', 'admin')),
  invited boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profiles_read_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  author text not null default 'Unknown author' check (char_length(author) <= 300),
  description text not null default '' check (char_length(description) <= 10000),
  genre text not null default 'Uncategorized' check (char_length(genre) <= 100),
  format text not null check (format in ('PDF', 'EPUB')),
  storage_path text not null unique check (char_length(storage_path) between 1 and 500),
  cover_path text unique check (char_length(cover_path) between 1 and 500),
  language text not null default 'en' check (char_length(language) <= 35),
  color text not null default 'olive' check (color in ('terracotta','olive','navy','cream','sage','plum','ochre','blue')),
  motif text not null default 'arch' check (motif in ('arch','orbit','leaves','waves','window','mountain')),
  cover_label text not null default 'YOUR READING ROOM' check (char_length(cover_label) <= 100),
  publication_year integer not null default extract(year from now()) check (publication_year between 0 and 9999),
  length_label text not null default '' check (char_length(length_label) <= 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.books enable row level security;
revoke all on public.books from anon, authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant all on public.books to service_role;
create policy books_read on public.books for select to authenticated using (
  exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and (books.is_published or p.role = 'admin'))
);
create policy books_admin_insert on public.books for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);
create policy books_admin_update on public.books for update to authenticated using (
  exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);
create policy books_admin_delete on public.books for delete to authenticated using (
  exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);

create table public.user_books (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  shelf_status text not null default 'want-to-read' check (shelf_status in ('want-to-read','reading','finished')),
  is_favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index user_books_book_idx on public.user_books(book_id);

create table public.reading_progress (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  locator_type text not null check (locator_type in ('pdf','epub')),
  locator jsonb not null,
  percentage numeric not null default 0 check (percentage between 0 and 100),
  last_read_at timestamptz not null default now(),
  primary key (user_id, book_id),
  constraint valid_progress_locator check (
    jsonb_typeof(locator) = 'object' and pg_column_size(locator) <= 4096 and coalesce(
      (locator_type = 'pdf' and jsonb_typeof(locator->'page') = 'number' and (locator->>'page') ~ '^[0-9]+$') or
      (locator_type = 'epub' and jsonb_typeof(locator->'cfi') = 'string' and (locator->>'cfi') like 'epubcfi(%'), false)
  )
);
create index reading_progress_book_idx on public.reading_progress(book_id);
create index reading_progress_recent_idx on public.reading_progress(user_id, last_read_at desc);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  locator_type text not null check (locator_type in ('pdf','epub')),
  locator jsonb not null,
  label text not null default '' check (char_length(label) <= 300),
  created_at timestamptz not null default now(),
  constraint valid_bookmark_locator check (
    jsonb_typeof(locator) = 'object' and pg_column_size(locator) <= 4096 and coalesce(
      (locator_type = 'pdf' and jsonb_typeof(locator->'page') = 'number' and (locator->>'page') ~ '^[0-9]+$') or
      (locator_type = 'epub' and jsonb_typeof(locator->'cfi') = 'string' and (locator->>'cfi') like 'epubcfi(%'), false)
  )
);
create index bookmarks_user_book_idx on public.bookmarks(user_id, book_id);
create index bookmarks_book_idx on public.bookmarks(book_id);

create table public.reader_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  theme text not null default 'paper' check (theme in ('paper','midnight','forest','classic')),
  font_family text not null default 'serif' check (font_family in ('serif','sans')),
  font_size integer not null default 20 check (font_size between 14 and 32),
  line_height numeric not null default 1.8 check (line_height between 1.3 and 2.2),
  reduced_motion boolean not null default false,
  page_width integer not null default 720 check (page_width between 320 and 1200),
  margin integer not null default 24 check (margin between 8 and 80),
  layout text not null default 'paginated' check (layout in ('paginated','scroll','spread')),
  tts_rate numeric not null default 1 check (tts_rate between 0.75 and 1.5)
);

-- A nonprivileged user cannot transfer a personal record to another account.
-- Reads and writes also require active membership and current book visibility.

alter table public.user_books enable row level security;
revoke all on public.user_books from anon, authenticated;
grant select, insert, update, delete on public.user_books to authenticated;
grant all on public.user_books to service_role;
create policy user_books_read on public.user_books for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = user_books.book_id));
create policy user_books_insert on public.user_books for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = user_books.book_id));
create policy user_books_update on public.user_books for update to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = user_books.book_id)) with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = user_books.book_id));
create policy user_books_delete on public.user_books for delete to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));

alter table public.reading_progress enable row level security;
revoke all on public.reading_progress from anon, authenticated;
grant select, insert, update, delete on public.reading_progress to authenticated;
grant all on public.reading_progress to service_role;
create policy reading_progress_read on public.reading_progress for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = reading_progress.book_id));
create policy reading_progress_insert on public.reading_progress for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = reading_progress.book_id));
create policy reading_progress_update on public.reading_progress for update to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = reading_progress.book_id)) with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = reading_progress.book_id));
create policy reading_progress_delete on public.reading_progress for delete to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));

alter table public.bookmarks enable row level security;
revoke all on public.bookmarks from anon, authenticated;
grant select, insert, update, delete on public.bookmarks to authenticated;
grant all on public.bookmarks to service_role;
create policy bookmarks_read on public.bookmarks for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = bookmarks.book_id));
create policy bookmarks_insert on public.bookmarks for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = bookmarks.book_id));
create policy bookmarks_update on public.bookmarks for update to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = bookmarks.book_id)) with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited) and exists (select 1 from public.books b where b.id = bookmarks.book_id));
create policy bookmarks_delete on public.bookmarks for delete to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));

alter table public.reader_preferences enable row level security;
revoke all on public.reader_preferences from anon, authenticated;
grant select, insert, update, delete on public.reader_preferences to authenticated;
grant all on public.reader_preferences to service_role;
create policy reader_preferences_read on public.reader_preferences for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));
create policy reader_preferences_insert on public.reader_preferences for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));
create policy reader_preferences_update on public.reader_preferences for update to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited)) with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));
create policy reader_preferences_delete on public.reader_preferences for delete to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', false, 52428800, array['application/pdf','application/epub+zip']),
       ('covers', 'covers', false, 5242880, array['image/jpeg','image/png','image/webp']);

create policy folio_files_read on storage.objects for select to authenticated using (
  bucket_id in ('books','covers') and (
    exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin') or
    exists (select 1 from public.books b where b.is_published and
      ((bucket_id = 'books' and b.storage_path = name) or (bucket_id = 'covers' and b.cover_path = name)))
  )
);
create policy folio_files_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('books','covers') and exists (
    select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);
create policy folio_files_update on storage.objects for update to authenticated using (
  bucket_id in ('books','covers') and exists (
    select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
) with check (
  bucket_id in ('books','covers') and exists (
    select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);
create policy folio_files_delete on storage.objects for delete to authenticated using (
  bucket_id in ('books','covers') and exists (
    select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.invited and p.role = 'admin')
);
