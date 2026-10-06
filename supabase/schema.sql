-- =====================================================================
--  Shorts STEAM Lab — Supabase схемасы
--  Supabase → SQL Editor → New query → осы файлды толық қойып → Run.
--  Қайта іске қосуға болады (идемпотентті).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
--  1. Кестелер
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text not null default '',
  subject      text not null default '',
  role         text not null default 'teacher' check (role in ('teacher', 'admin')),
  is_blocked   boolean not null default false,
  posts_count  integer not null default 0,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 140),
  description   text not null default '' check (char_length(description) <= 4000),
  section       text not null check (section in ('science', 'technology', 'engineering', 'art', 'math')),
  subject       text not null default '',
  grade         text not null default '',
  kind          text not null default 'video' check (kind in ('video', 'youtube', 'image', 'text')),
  video_path    text,
  thumb_path    text,
  image_path    text,
  youtube_id    text,
  external_url  text,
  duration      real,
  is_lab        boolean not null default false,
  likes_count   integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists posts_feed_idx    on public.posts (is_lab, created_at desc);
create index if not exists posts_section_idx on public.posts (section, created_at desc);
create index if not exists posts_author_idx  on public.posts (author_id, created_at desc);

create table if not exists public.likes (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id     uuid not null references public.posts (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists likes_post_idx on public.likes (post_id);

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text not null default '' check (char_length(reason) <= 300),
  status      text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 1 and 160),
  body        text not null default '' check (char_length(body) <= 4000),
  author_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);

-- ---------------------------------------------------------------------
--  2. Көмекші функциялар
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and not is_blocked);
$$;

-- ---------------------------------------------------------------------
--  3. Триггерлер
-- ---------------------------------------------------------------------
-- Профиль: email auth.users-тен алынады; ең бірінші қолданушы — әкімші.
create or replace function public.profiles_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := coalesce((select u.email from auth.users u where u.id = new.id), new.email);
  new.role := case when exists (select 1 from public.profiles where role = 'admin') then 'teacher' else 'admin' end;
  new.is_blocked := false;
  new.posts_count := 0;
  new.created_at := now();
  if coalesce(trim(new.full_name), '') = '' then
    new.full_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  return new;
end $$;

drop trigger if exists profiles_before_insert on public.profiles;
create trigger profiles_before_insert before insert on public.profiles
  for each row execute function public.profiles_before_insert();

-- Тіркелу кезінде профиль автоматты түрде құрылады.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, subject)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'subject', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Пост: автор = ағымдағы қолданушы; Lab-қа тек әкімші жариялайды.
create or replace function public.posts_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    if not public.is_admin() then
      new.is_lab := false;
    end if;
  end if;
  new.likes_count := 0;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists posts_before_insert on public.posts;
create trigger posts_before_insert before insert on public.posts
  for each row execute function public.posts_before_insert();

-- Әр қолданушының жүктеулер саны.
create or replace function public.posts_count_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.author_id;
  end if;
  return null;
end $$;

drop trigger if exists posts_count_trg on public.posts;
create trigger posts_count_trg after insert or delete on public.posts
  for each row execute function public.posts_count_trg();

-- Ұнатулар саны.
create or replace function public.likes_count_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_count_trg on public.likes;
create trigger likes_count_trg after insert or delete on public.likes
  for each row execute function public.likes_count_trg();

-- Бұрын тіркелген қолданушылар болса, олардың профилін құру.
insert into public.profiles (id, full_name, subject)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), coalesce(u.raw_user_meta_data ->> 'subject', '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
--  4. Қауіпсіздік (RLS + баған құқықтары)
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.likes         enable row level security;
alter table public.reports       enable row level security;
alter table public.announcements enable row level security;

-- profiles: барлығы көреді (email-ден басқа), өзін ғана өңдейді
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, subject, role, is_blocked, posts_count, avatar_url, created_at) on public.profiles to authenticated;
grant insert (id, full_name, subject) on public.profiles to authenticated;
grant update (full_name, subject, avatar_url) on public.profiles to authenticated;

-- posts
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select to authenticated using (true);
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_user());
drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

revoke all on public.posts from anon, authenticated;
grant select, delete on public.posts to authenticated;
grant insert (id, author_id, title, description, section, subject, grade, kind, video_path, thumb_path,
              image_path, youtube_id, external_url, duration, is_lab) on public.posts to authenticated;
grant update (title, description, section, subject, grade) on public.posts to authenticated;

-- likes
drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own" on public.likes for select to authenticated using (user_id = auth.uid());
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes for delete to authenticated using (user_id = auth.uid());

revoke all on public.likes from anon, authenticated;
grant select, insert, delete on public.likes to authenticated;

-- reports
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reports_delete_admin" on public.reports;
create policy "reports_delete_admin" on public.reports for delete to authenticated using (public.is_admin());

revoke all on public.reports from anon, authenticated;
grant select, delete on public.reports to authenticated;
grant insert (post_id, user_id, reason) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- announcements
drop policy if exists "ann_select" on public.announcements;
create policy "ann_select" on public.announcements for select to authenticated using (true);
drop policy if exists "ann_insert_admin" on public.announcements;
create policy "ann_insert_admin" on public.announcements for insert to authenticated with check (public.is_admin());
drop policy if exists "ann_update_admin" on public.announcements;
create policy "ann_update_admin" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "ann_delete_admin" on public.announcements;
create policy "ann_delete_admin" on public.announcements for delete to authenticated using (public.is_admin());

revoke all on public.announcements from anon, authenticated;
grant select, delete on public.announcements to authenticated;
grant insert (title, body, author_id) on public.announcements to authenticated;
grant update (title, body) on public.announcements to authenticated;

-- ---------------------------------------------------------------------
--  5. Әкімші функциялары (RPC)
-- ---------------------------------------------------------------------
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'users',           (select count(*) from public.profiles),
    'posts',           (select count(*) from public.posts),
    'lab_posts',       (select count(*) from public.posts where is_lab),
    'pending_reports', (select count(distinct post_id) from public.reports where status = 'pending'),
    'announcements',   (select count(*) from public.announcements)
  );
end $$;

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, full_name text, subject text, role text, is_blocked boolean,
  posts_count integer, likes_received bigint, created_at timestamptz, last_sign_in_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.subject, p.role, p.is_blocked, p.posts_count,
         coalesce((select sum(x.likes_count) from public.posts x where x.author_id = p.id), 0)::bigint,
         p.created_at, u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if new_role not in ('teacher', 'admin') then raise exception 'bad_role'; end if;
  if new_role = 'teacher'
     and exists (select 1 from public.profiles where id = target and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'last_admin';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;

create or replace function public.admin_set_blocked(target uuid, blocked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'self'; end if;
  update public.profiles set is_blocked = blocked where id = target;
end $$;

create or replace function public.admin_set_post_lab(target uuid, lab boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.posts set is_lab = lab where id = target;
end $$;

-- Мұғалім құпия сөзін ұмытса, әкімші уақытша құпия сөз береді.
create or replace function public.admin_reset_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if char_length(coalesce(new_password, '')) < 6 then raise exception 'weak_password'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
         updated_at = now()
   where id = target;
end $$;

create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'self'; end if;
  delete from auth.users where id = target;
end $$;

revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_set_blocked(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_post_lab(uuid, boolean) from public, anon;
revoke execute on function public.admin_reset_password(uuid, text) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_set_post_lab(uuid, boolean) to authenticated;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------
--  6. Файлдар қоймасы (видео, суреттер)
-- ---------------------------------------------------------------------
-- Тегін жоспарда бір файлдың ең үлкен көлемі — 50 МБ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['video/*', 'image/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ssl_media_select" on storage.objects;
create policy "ssl_media_select" on storage.objects for select to authenticated
  using (bucket_id = 'media');

drop policy if exists "ssl_media_insert_own" on storage.objects;
create policy "ssl_media_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

drop policy if exists "ssl_media_delete" on storage.objects;
create policy "ssl_media_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- PostgREST кэшін жаңарту
notify pgrst, 'reload schema';

-- Дайын! Сайтқа бірінші тіркелген адам автоматты түрде әкімші болады.
-- Басқа біреуді әкімші ету (қажет болса):
--   update public.profiles set role = 'admin' where email = 'mail@example.com';
