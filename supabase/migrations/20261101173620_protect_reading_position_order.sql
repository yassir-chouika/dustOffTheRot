-- A delayed browser-exit request must not replace a newer saved position.
-- This trigger runs with the caller's privileges and never bypasses RLS.
create function public.keep_latest_reading_position()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.last_read_at < old.last_read_at then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.keep_latest_reading_position() from public, anon, authenticated;
create trigger keep_latest_reading_position
before update on public.reading_progress
for each row execute function public.keep_latest_reading_position();
