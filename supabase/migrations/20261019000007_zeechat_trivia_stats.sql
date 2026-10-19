-- Sync Quickfire Trivia best scores and streaks across a user's devices.
create table if not exists public.zeechat_trivia_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_score integer not null default 0 check (best_score between 0 and 5),
  streak integer not null default 0 check (streak >= 0),
  last_played date,
  updated_at timestamptz not null default now()
);

alter table public.zeechat_trivia_stats enable row level security;

drop policy if exists "Users read their own trivia stats" on public.zeechat_trivia_stats;
create policy "Users read their own trivia stats"
  on public.zeechat_trivia_stats for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users create their own trivia stats" on public.zeechat_trivia_stats;
create policy "Users create their own trivia stats"
  on public.zeechat_trivia_stats for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own trivia stats" on public.zeechat_trivia_stats;
create policy "Users update their own trivia stats"
  on public.zeechat_trivia_stats for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.zeechat_trivia_stats to authenticated;