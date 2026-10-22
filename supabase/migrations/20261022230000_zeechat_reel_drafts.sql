-- Persist in-progress video/Reel drafts without publishing them to the feed.
create table if not exists public.zeechat_reel_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2200),
  media_path text not null,
  media_type text not null check (media_type in ('video/mp4','video/webm','video/quicktime')),
  media_name text not null default 'reel-draft.mp4',
  filter_name text not null default 'none' check (filter_name in ('none','warm','mono','vivid','cool','fade')),
  zoom numeric not null default 1 check (zoom >= 1 and zoom <= 2.5),
  crop_ratio text not null default 'original' check (crop_ratio in ('original','square','portrait','story')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zeechat_reel_drafts_user_updated_idx
  on public.zeechat_reel_drafts(user_id, updated_at desc);

alter table public.zeechat_reel_drafts enable row level security;

drop policy if exists "Users manage their own Reel drafts" on public.zeechat_reel_drafts;
create policy "Users read their own Reel drafts"
  on public.zeechat_reel_drafts for select to authenticated
  using (auth.uid() = user_id);
create policy "Users create their own Reel drafts"
  on public.zeechat_reel_drafts for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update their own Reel drafts"
  on public.zeechat_reel_drafts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users delete their own Reel drafts"
  on public.zeechat_reel_drafts for delete to authenticated
  using (auth.uid() = user_id);
