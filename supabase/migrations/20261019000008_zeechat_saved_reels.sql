-- Private saved Reel library. Saves are visible only to their owner.
create table if not exists public.zeechat_saved_reels (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.zeechat_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists zeechat_saved_reels_user_created_idx
  on public.zeechat_saved_reels (user_id, created_at desc);

alter table public.zeechat_saved_reels enable row level security;

drop policy if exists "Users read their own saved Reels" on public.zeechat_saved_reels;
create policy "Users read their own saved Reels"
  on public.zeechat_saved_reels for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users save public Reels for themselves" on public.zeechat_saved_reels;
create policy "Users save public Reels for themselves"
  on public.zeechat_saved_reels for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.zeechat_posts post
      where post.id = post_id and post.visibility = 'public'
    )
  );

drop policy if exists "Users remove their own saved Reels" on public.zeechat_saved_reels;
create policy "Users remove their own saved Reels"
  on public.zeechat_saved_reels for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.zeechat_saved_reels to authenticated;
