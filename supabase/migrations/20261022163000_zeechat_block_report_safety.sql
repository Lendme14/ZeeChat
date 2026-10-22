create table if not exists public.zeechat_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint zeechat_user_blocks_no_self check (blocker_id <> blocked_id)
);
alter table public.zeechat_user_blocks enable row level security;
drop policy if exists "Users can view their own blocks" on public.zeechat_user_blocks;
create policy "Users can view their own blocks" on public.zeechat_user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
drop policy if exists "Users can block others" on public.zeechat_user_blocks;
create policy "Users can block others" on public.zeechat_user_blocks for insert to authenticated with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));
drop policy if exists "Users can unblock others" on public.zeechat_user_blocks;
create policy "Users can unblock others" on public.zeechat_user_blocks for delete to authenticated using (blocker_id = (select auth.uid()));
grant select, insert, delete on public.zeechat_user_blocks to authenticated;

create table if not exists public.zeechat_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate_or_violence', 'impersonation', 'inappropriate_content', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  constraint zeechat_user_reports_no_self check (reporter_id <> reported_user_id)
);
create index if not exists zeechat_user_reports_status_created_idx on public.zeechat_user_reports(status, created_at desc);
alter table public.zeechat_user_reports enable row level security;
drop policy if exists "Users can submit reports" on public.zeechat_user_reports;
create policy "Users can submit reports" on public.zeechat_user_reports for insert to authenticated with check (reporter_id = (select auth.uid()) and reported_user_id <> (select auth.uid()));
drop policy if exists "Users can view their own reports" on public.zeechat_user_reports;
create policy "Users can view their own reports" on public.zeechat_user_reports for select to authenticated using (reporter_id = (select auth.uid()));
grant select, insert on public.zeechat_user_reports to authenticated;

create or replace function private.zeechat_has_block_between_users(p_conversation_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.zeechat_conversation_members me
    join public.zeechat_conversation_members other on other.conversation_id = me.conversation_id and other.user_id <> me.user_id
    join public.zeechat_user_blocks b on (b.blocker_id = p_user_id and b.blocked_id = other.user_id) or (b.blocker_id = other.user_id and b.blocked_id = p_user_id)
    where me.conversation_id = p_conversation_id and me.user_id = p_user_id
  );
$$;
revoke all on function private.zeechat_has_block_between_users(uuid, uuid) from public;
grant execute on function private.zeechat_has_block_between_users(uuid, uuid) to authenticated;

drop policy if exists "Members can send messages" on public.zeechat_messages;
create policy "Members can send messages" on public.zeechat_messages for insert to authenticated with check (
 sender_id = (select auth.uid())
 and private.zeechat_is_conversation_member(conversation_id, (select auth.uid()))
 and not private.zeechat_has_block_between_users(conversation_id, (select auth.uid()))
);
drop policy if exists "Members can read messages" on public.zeechat_messages;
create policy "Members can read messages" on public.zeechat_messages for select to authenticated using (
 private.zeechat_is_conversation_member(conversation_id, (select auth.uid()))
 and not private.zeechat_has_block_between_users(conversation_id, (select auth.uid()))
);
