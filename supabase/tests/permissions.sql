-- Transaction-scoped identities exercise database roles without sending email,
-- issuing tokens, or leaving accounts/documents in the hosted project.
-- Real password sign-in and Storage HTTP checks are separate release checks.
begin;
select set_config('folio.test.owner', gen_random_uuid()::text, true);
select set_config('folio.test.reader', gen_random_uuid()::text, true);
select set_config('folio.test.other', gen_random_uuid()::text, true);
select set_config('folio.test.uninvited', gen_random_uuid()::text, true);
select set_config('folio.test.published', gen_random_uuid()::text, true);
select set_config('folio.test.draft', gen_random_uuid()::text, true);
insert into auth.users(id) values
  (current_setting('folio.test.owner')::uuid), (current_setting('folio.test.reader')::uuid),
  (current_setting('folio.test.other')::uuid), (current_setting('folio.test.uninvited')::uuid);
insert into public.profiles(user_id, role, invited) values
  (current_setting('folio.test.owner')::uuid, 'admin', true),
  (current_setting('folio.test.reader')::uuid, 'reader', true),
  (current_setting('folio.test.other')::uuid, 'reader', true),
  (current_setting('folio.test.uninvited')::uuid, 'reader', false);
insert into public.books(id,title,format,storage_path,is_published) values
  (current_setting('folio.test.published')::uuid,'Permission test','PDF',gen_random_uuid()::text || '/test.pdf',true),
  (current_setting('folio.test.draft')::uuid,'Unpublished permission test','EPUB',gen_random_uuid()::text || '/test.epub',false);
insert into public.reading_progress(user_id,book_id,locator_type,locator,percentage)
values (current_setting('folio.test.other')::uuid,current_setting('folio.test.published')::uuid,'pdf','{"page":0}',10);
insert into public.user_books(user_id,book_id)
values (current_setting('folio.test.other')::uuid,current_setting('folio.test.published')::uuid);
insert into public.bookmarks(user_id,book_id,locator_type,locator)
values (current_setting('folio.test.other')::uuid,current_setting('folio.test.published')::uuid,'pdf','{"page":0}');
insert into public.reader_preferences(user_id) values (current_setting('folio.test.other')::uuid);

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('folio.test.reader'),'role','authenticated')::text,true);
do $$
begin
  if (select count(*) from public.books where id in (current_setting('folio.test.published')::uuid,current_setting('folio.test.draft')::uuid)) <> 1 then raise exception 'Reader catalog visibility failed'; end if;
  if exists(select 1 from public.reading_progress) or exists(select 1 from public.bookmarks)
    or exists(select 1 from public.user_books) or exists(select 1 from public.reader_preferences)
    then raise exception 'Reader can see another account data'; end if;
  begin
    insert into public.books(title,format,storage_path) values ('Denied','PDF','denied.pdf');
    raise exception 'Reader inserted shared metadata';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set role='admin' where user_id=(select auth.uid());
    raise exception 'Reader changed role';
  exception when insufficient_privilege then null; end;
  insert into public.reading_progress(user_id,book_id,locator_type,locator)
    values ((select auth.uid()),current_setting('folio.test.published')::uuid,'pdf','{"page":1}');
  update public.reading_progress set percentage=20 where user_id=(select auth.uid());
  if not exists(select 1 from public.reading_progress where percentage=20) then raise exception 'Own progress update failed'; end if;
  update public.reading_progress set percentage=90, last_read_at=now()+interval '1 second' where user_id=(select auth.uid());
  update public.reading_progress set percentage=10, last_read_at=now() where user_id=(select auth.uid());
  if not exists(select 1 from public.reading_progress where percentage=90) then raise exception 'Stale reading position overwrote newer progress'; end if;
  begin
    update public.reading_progress set user_id=current_setting('folio.test.uninvited')::uuid;
    raise exception 'Reader transferred progress ownership';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.bookmarks(user_id,book_id,locator_type,locator)
      values ((select auth.uid()),current_setting('folio.test.draft')::uuid,'epub','{"cfi":"epubcfi(/6/2)"}');
    raise exception 'Reader bookmarked unpublished book';
  exception when insufficient_privilege then null; end;
  insert into public.reader_preferences(user_id,theme) values ((select auth.uid()),'forest');
  insert into public.user_books(user_id,book_id,is_favorite)
    values ((select auth.uid()),current_setting('folio.test.published')::uuid,true);
  insert into public.bookmarks(user_id,book_id,locator_type,locator)
    values ((select auth.uid()),current_setting('folio.test.published')::uuid,'pdf','{"page":1}');
  begin
    insert into storage.objects(bucket_id,name) values ('books',gen_random_uuid()::text || '/denied.pdf');
    raise exception 'Reader uploaded a storage object';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('folio.test.owner'),'role','authenticated')::text,true);
do $$
declare test_book uuid;
begin
  if (select count(*) from public.books where id in (current_setting('folio.test.published')::uuid,current_setting('folio.test.draft')::uuid)) <> 2 then raise exception 'Admin cannot see drafts'; end if;
  if exists(select 1 from public.reading_progress) then raise exception 'Admin can read another reader progress'; end if;
  insert into public.books(title,format,storage_path) values ('Admin test','PDF',gen_random_uuid()::text || '.pdf') returning id into test_book;
  update public.books set is_published=true where id=test_book;
  if not exists(select 1 from public.books where id=test_book and is_published) then raise exception 'Admin publication failed'; end if;
  delete from public.books where id=test_book;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('folio.test.uninvited'),'role','authenticated')::text,true);
do $$
begin
  if exists(select 1 from public.books) then raise exception 'Unapproved account can read library'; end if;
  begin
    insert into public.reader_preferences(user_id) values ((select auth.uid()));
    raise exception 'Unapproved account wrote preferences';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$
begin
  begin
    perform 1 from public.books;
    raise exception 'Anonymous catalog access was granted';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from storage.objects where bucket_id in ('books','covers')) then raise exception 'Anonymous object visibility'; end if;
end $$;
reset role;
select 'Database permission checks passed; all fixture data will be rolled back.' as result;
rollback;
