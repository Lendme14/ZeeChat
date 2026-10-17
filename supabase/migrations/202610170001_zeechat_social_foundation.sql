-- ZeeChat-owned social data. Additive migration; does not alter Zonix tables.
create table if not exists public.zeechat_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  display_name text not null default 'New ZeeChatter' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text,
  cover_url text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zeechat_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'text' check (post_type in ('text','image','video','reel')),
  caption text not null default '' check (char_length(caption) <= 2200),
  media_url text,
  thumbnail_url text,
  visibility text not null default 'public' check (visibility in ('public','followers')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (post_type = 'text' or media_url is not null)
);

create table if not exists public.zeechat_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table if not exists public.zeechat_post_likes (
  post_id uuid not null references public.zeechat_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.zeechat_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.zeechat_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists zeechat_posts_author_created_idx on public.zeechat_posts(author_id, created_at desc);
create index if not exists zeechat_posts_feed_idx on public.zeechat_posts(created_at desc) where visibility = 'public';
create index if not exists zeechat_comments_post_created_idx on public.zeechat_comments(post_id, created_at asc);
create index if not exists zeechat_follows_followed_idx on public.zeechat_follows(followed_id, follower_id);

alter table public.zeechat_profiles enable row level security;
alter table public.zeechat_posts enable row level security;
alter table public.zeechat_follows enable row level security;
alter table public.zeechat_post_likes enable row level security;
alter table public.zeechat_comments enable row level security;

create policy "ZeeChat profiles are readable" on public.zeechat_profiles for select using (true);
create policy "Users create their ZeeChat profile" on public.zeechat_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update their ZeeChat profile" on public.zeechat_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Read visible ZeeChat posts" on public.zeechat_posts for select using (
  (visibility = 'public' and exists (select 1 from public.zeechat_profiles p where p.user_id = author_id and p.is_private = false))
  or author_id = auth.uid()
  or (visibility = 'followers' and exists (select 1 from public.zeechat_follows f where f.follower_id = auth.uid() and f.followed_id = author_id))
);
create policy "Users create their ZeeChat posts" on public.zeechat_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Users update their ZeeChat posts" on public.zeechat_posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users delete their ZeeChat posts" on public.zeechat_posts for delete to authenticated using (auth.uid() = author_id);

create policy "Read ZeeChat follows" on public.zeechat_follows for select using (true);
create policy "Users follow from their own account" on public.zeechat_follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "Users unfollow from their own account" on public.zeechat_follows for delete to authenticated using (auth.uid() = follower_id);

create policy "Read likes on readable posts" on public.zeechat_post_likes for select using (exists (select 1 from public.zeechat_posts p where p.id = post_id));
create policy "Users like as themselves" on public.zeechat_post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove their own likes" on public.zeechat_post_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Read comments on readable posts" on public.zeechat_comments for select using (exists (select 1 from public.zeechat_posts p where p.id = post_id));
create policy "Users comment as themselves" on public.zeechat_comments for insert to authenticated with check (
  auth.uid() = author_id and exists (select 1 from public.zeechat_posts p where p.id = post_id)
);
create policy "Users delete their own comments" on public.zeechat_comments for delete to authenticated using (auth.uid() = author_id);

create or replace function public.zeechat_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', 'user');
  safe_username := regexp_replace(lower(requested_username), '[^a-z0-9_.]', '', 'g');
  if char_length(safe_username) < 3 then
    safe_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;
  if char_length(safe_username) > 24 then safe_username := left(safe_username, 24); end if;
  if exists (select 1 from public.zeechat_profiles p where p.username = safe_username) then
    safe_username := left(safe_username, 15) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.zeechat_profiles (user_id, username, display_name)
  values (new.id, safe_username, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), safe_username), 60))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_zeechat_profile on auth.users;
create trigger on_auth_user_created_zeechat_profile
after insert on auth.users
for each row execute procedure public.zeechat_handle_new_user();
