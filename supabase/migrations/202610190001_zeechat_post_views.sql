-- Durable view tracking for ZeeChat posts and Reels.
create table if not exists public.zeechat_post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.zeechat_posts(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists zeechat_post_views_post_idx
  on public.zeechat_post_views(post_id);

create index if not exists zeechat_post_views_viewer_post_idx
  on public.zeechat_post_views(viewer_id, post_id)
  where viewer_id is not null;

alter table public.zeechat_post_views enable row level security;

drop policy if exists "Read views on readable ZeeChat posts" on public.zeechat_post_views;
drop policy if exists "Record ZeeChat post views" on public.zeechat_post_views;
create policy "Record ZeeChat post views"
  on public.zeechat_post_views for insert to anon, authenticated
  with check (
    (viewer_id is null or viewer_id = (select auth.uid()))
    and exists (
      select 1 from public.zeechat_posts p
      where p.id = post_id
    )
  );

-- Raw view rows contain user IDs and timestamps; expose inserts only.
revoke all on public.zeechat_post_views from anon, authenticated;
grant insert on public.zeechat_post_views to anon, authenticated;
