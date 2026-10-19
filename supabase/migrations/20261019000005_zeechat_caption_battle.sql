-- Daily ZeeChat Caption Battle: one entry per user/day and one vote per user/entry.
create table if not exists public.zeechat_caption_battles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null default ((now() at time zone 'UTC')::date),
  caption text not null check (char_length(btrim(caption)) between 3 and 240),
  vote_count integer not null default 0 check (vote_count >= 0),
  created_at timestamptz not null default now(),
  constraint zeechat_caption_battles_one_entry_per_day unique (author_id, challenge_date)
);

create index if not exists zeechat_caption_battles_daily_ranking_idx
  on public.zeechat_caption_battles (challenge_date, vote_count desc, created_at desc);

create table if not exists public.zeechat_caption_battle_votes (
  entry_id uuid not null references public.zeechat_caption_battles(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, voter_id)
);

create index if not exists zeechat_caption_battle_votes_voter_idx
  on public.zeechat_caption_battle_votes (voter_id, created_at desc);

alter table public.zeechat_caption_battles enable row level security;
alter table public.zeechat_caption_battle_votes enable row level security;

drop policy if exists "Authenticated users can read daily caption entries" on public.zeechat_caption_battles;
create policy "Authenticated users can read daily caption entries"
  on public.zeechat_caption_battles for select to authenticated
  using (true);

drop policy if exists "Users can submit their own daily caption" on public.zeechat_caption_battles;
create policy "Users can submit their own daily caption"
  on public.zeechat_caption_battles for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and challenge_date = ((now() at time zone 'UTC')::date)
    and char_length(btrim(caption)) between 3 and 240
  );

drop policy if exists "Users can delete their own caption entry" on public.zeechat_caption_battles;
create policy "Users can delete their own caption entry"
  on public.zeechat_caption_battles for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Users can read their own caption votes" on public.zeechat_caption_battle_votes;
create policy "Users can read their own caption votes"
  on public.zeechat_caption_battle_votes for select to authenticated
  using (voter_id = (select auth.uid()));

drop policy if exists "Users can vote once on another caption" on public.zeechat_caption_battle_votes;
create policy "Users can vote once on another caption"
  on public.zeechat_caption_battle_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1
      from public.zeechat_caption_battles entry
      where entry.id = entry_id
        and entry.author_id <> (select auth.uid())
        and entry.challenge_date = ((now() at time zone 'UTC')::date)
    )
  );

grant select, insert, delete on public.zeechat_caption_battles to authenticated;
grant select, insert on public.zeechat_caption_battle_votes to authenticated;

create or replace function private.zeechat_update_caption_battle_vote_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    update public.zeechat_caption_battles
      set vote_count = vote_count + 1
      where id = new.entry_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.zeechat_caption_battles
      set vote_count = greatest(vote_count - 1, 0)
      where id = old.entry_id;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function private.zeechat_update_caption_battle_vote_count() from public, anon, authenticated;

drop trigger if exists zeechat_caption_battle_vote_count on public.zeechat_caption_battle_votes;
create trigger zeechat_caption_battle_vote_count
  after insert or delete on public.zeechat_caption_battle_votes
  for each row execute function private.zeechat_update_caption_battle_vote_count();
