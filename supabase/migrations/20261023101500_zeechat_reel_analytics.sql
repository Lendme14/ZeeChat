-- Private per-Reel creator analytics events.
create table if not exists public.zeechat_reel_analytics_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.zeechat_posts(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('watch_session', 'completion', 'share', 'save')),
  watch_seconds integer not null default 0 check (watch_seconds >= 0 and watch_seconds <= 86400),
  completion_pct smallint not null default 0 check (completion_pct >= 0 and completion_pct <= 100),
  created_at timestamptz not null default now()
);

create index if not exists zeechat_reel_analytics_post_created_idx
  on public.zeechat_reel_analytics_events (post_id, created_at desc);
create index if not exists zeechat_reel_analytics_viewer_created_idx
  on public.zeechat_reel_analytics_events (viewer_id, created_at desc);

alter table public.zeechat_reel_analytics_events enable row level security;

drop policy if exists "Creators can read analytics for their own Reels" on public.zeechat_reel_analytics_events;
create policy "Creators can read analytics for their own Reels"
  on public.zeechat_reel_analytics_events
  for select to authenticated
  using (
    exists (
      select 1 from public.zeechat_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

drop policy if exists "Signed-in viewers can record Reel analytics" on public.zeechat_reel_analytics_events;
create policy "Signed-in viewers can record Reel analytics"
  on public.zeechat_reel_analytics_events
  for insert to authenticated
  with check (
    viewer_id = (select auth.uid())
    and exists (
      select 1 from public.zeechat_posts p
      where p.id = post_id
        and p.author_id <> (select auth.uid())
        and (p.visibility = 'public' or (p.visibility = 'followers' and exists (select 1 from public.zeechat_follows f where f.follower_id = (select auth.uid()) and f.followed_id = p.author_id)))
    )
  );


-- Reel owners can inspect the view timeline for their own posts.
drop policy if exists "Creators can read views for their own Reels" on public.zeechat_post_views;
create policy "Creators can read views for their own Reels"
  on public.zeechat_post_views
  for select to authenticated
  using (
    exists (
      select 1 from public.zeechat_posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
  );

grant select, insert on public.zeechat_reel_analytics_events to authenticated;
grant select on public.zeechat_post_views to authenticated;
