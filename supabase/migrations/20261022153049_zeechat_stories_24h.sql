create table if not exists public.zeechat_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text not null default '' check (char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint zeechat_stories_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '24 hours')
);

create index if not exists zeechat_stories_active_created_idx
  on public.zeechat_stories (expires_at, created_at);

alter table public.zeechat_stories enable row level security;

drop policy if exists "Authenticated users can view active ZeeChat stories" on public.zeechat_stories;
create policy "Authenticated users can view active ZeeChat stories"
  on public.zeechat_stories for select to authenticated
  using (expires_at > now());

drop policy if exists "Users can publish their own ZeeChat stories" on public.zeechat_stories;
create policy "Users can publish their own ZeeChat stories"
  on public.zeechat_stories for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and expires_at > now()
    and expires_at <= now() + interval '24 hours'
  );

drop policy if exists "Users can delete their own ZeeChat stories" on public.zeechat_stories;
create policy "Users can delete their own ZeeChat stories"
  on public.zeechat_stories for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.zeechat_stories to authenticated;