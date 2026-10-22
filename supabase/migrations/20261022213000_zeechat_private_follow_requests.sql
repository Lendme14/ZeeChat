-- Private-account follow requests for ZeeChat.
create table if not exists public.zeechat_follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, target_id),
  check (requester_id <> target_id)
);

create index if not exists zeechat_follow_requests_target_pending_idx
  on public.zeechat_follow_requests(target_id, created_at desc)
  where status = 'pending';

alter table public.zeechat_follow_requests enable row level security;

drop policy if exists "Participants can read ZeeChat follow requests" on public.zeechat_follow_requests;
create policy "Participants can read ZeeChat follow requests"
  on public.zeechat_follow_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "Requesters can request private follows" on public.zeechat_follow_requests;
create policy "Requesters can request private follows"
  on public.zeechat_follow_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and exists (
      select 1 from public.zeechat_profiles p
      where p.user_id = target_id and p.is_private = true
    )
  );

drop policy if exists "Requesters can cancel pending follow requests" on public.zeechat_follow_requests;
create policy "Requesters can cancel pending follow requests"
  on public.zeechat_follow_requests for delete to authenticated
  using (auth.uid() = requester_id and status = 'pending');

create or replace function public.zeechat_respond_follow_request(p_request_id uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.zeechat_follow_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into request_row
  from public.zeechat_follow_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Follow request not found';
  end if;
  if request_row.target_id <> auth.uid() then
    raise exception 'Only the account owner can respond to this request';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'This follow request has already been handled';
  end if;

  update public.zeechat_follow_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      responded_at = pg_catalog.now()
  where id = p_request_id;

  if p_approve then
    insert into public.zeechat_follows(follower_id, followed_id)
    values (request_row.requester_id, request_row.target_id)
    on conflict (follower_id, followed_id) do nothing;
    return 'approved';
  end if;
  return 'rejected';
end;
$$;

revoke all on function public.zeechat_respond_follow_request(uuid, boolean) from public, anon;
grant execute on function public.zeechat_respond_follow_request(uuid, boolean) to authenticated;

-- Direct follow inserts are allowed only for public accounts. Private accounts
-- must use the request/approval flow above.
drop policy if exists "Users follow from their own account" on public.zeechat_follows;
create policy "Users follow from their own account"
  on public.zeechat_follows for insert to authenticated
  with check (
    auth.uid() = follower_id
    and exists (
      select 1 from public.zeechat_profiles p
      where p.user_id = followed_id and p.is_private = false
    )
  );
