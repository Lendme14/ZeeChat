-- Functional ZeeChat parties: persistent rooms/events, attendance, and host controls.
create table if not exists public.zeechat_parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 70),
  description text not null default '' check (char_length(description) <= 240),
  format text not null default 'video' check (format in ('video', 'audio', 'watch')),
  access text not null default 'public' check (access in ('public', 'private')),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  scheduled_at timestamptz not null default (now() + interval '1 hour'),
  participant_count integer not null default 0 check (participant_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zeechat_parties_discovery_idx
  on public.zeechat_parties (access, status, scheduled_at desc);

create table if not exists public.zeechat_party_members (
  party_id uuid not null references public.zeechat_parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create index if not exists zeechat_party_members_user_idx
  on public.zeechat_party_members (user_id, joined_at desc);

alter table public.zeechat_parties enable row level security;
alter table public.zeechat_party_members enable row level security;

drop policy if exists "Authenticated users discover public parties and their own" on public.zeechat_parties;
create policy "Authenticated users discover public parties and their own"
  on public.zeechat_parties for select to authenticated
  using (
    access = 'public' or host_id = (select auth.uid())
  );

drop policy if exists "Authenticated users create their own parties" on public.zeechat_parties;
create policy "Authenticated users create their own parties"
  on public.zeechat_parties for insert to authenticated
  with check (host_id = (select auth.uid()));

drop policy if exists "Hosts update their own parties" on public.zeechat_parties;
create policy "Hosts update their own parties"
  on public.zeechat_parties for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

drop policy if exists "Hosts delete their own parties" on public.zeechat_parties;
create policy "Hosts delete their own parties"
  on public.zeechat_parties for delete to authenticated
  using (host_id = (select auth.uid()));

drop policy if exists "Users read their own party memberships" on public.zeechat_party_members;
create policy "Users read their own party memberships"
  on public.zeechat_party_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users join public parties" on public.zeechat_party_members;
create policy "Users join public parties"
  on public.zeechat_party_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.zeechat_parties party
      where party.id = party_id
        and party.access = 'public'
        and party.status <> 'ended'
    )
  );

drop policy if exists "Users leave their own party memberships" on public.zeechat_party_members;
create policy "Users leave their own party memberships"
  on public.zeechat_party_members for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.zeechat_update_party_participant_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    update public.zeechat_parties
      set participant_count = participant_count + 1,
          updated_at = now()
      where id = new.party_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.zeechat_parties
      set participant_count = greatest(participant_count - 1, 0),
          updated_at = now()
      where id = old.party_id;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function private.zeechat_update_party_participant_count() from public, anon, authenticated;

drop trigger if exists zeechat_party_participant_count on public.zeechat_party_members;
create trigger zeechat_party_participant_count
  after insert or delete on public.zeechat_party_members
  for each row execute function private.zeechat_update_party_participant_count();

grant select, insert, update, delete on public.zeechat_parties to authenticated;
grant select, insert, delete on public.zeechat_party_members to authenticated;
