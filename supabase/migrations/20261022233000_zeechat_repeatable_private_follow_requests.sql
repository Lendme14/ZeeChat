-- Make private follow requests safely repeatable after an unfollow.
create or replace function public.zeechat_request_private_follow(p_target_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := auth.uid();
  target_is_private boolean;
begin
  if requester is null then
    raise exception 'Authentication required';
  end if;
  if p_target_id is null or p_target_id = requester then
    raise exception 'Choose another account to follow';
  end if;

  select p.is_private into target_is_private
  from public.zeechat_profiles p
  where p.user_id = p_target_id;

  if target_is_private is distinct from true then
    raise exception 'Follow requests are only for private accounts';
  end if;

  if exists (
    select 1 from public.zeechat_follows f
    where f.follower_id = requester and f.followed_id = p_target_id
  ) then
    return 'following';
  end if;

  insert into public.zeechat_follow_requests(requester_id, target_id, status, created_at, responded_at)
  values (requester, p_target_id, 'pending', pg_catalog.now(), null)
  on conflict (requester_id, target_id) do update
    set status = 'pending',
        created_at = pg_catalog.now(),
        responded_at = null;

  return 'pending';
end;
$$;

revoke all on function public.zeechat_request_private_follow(uuid) from public, anon;
grant execute on function public.zeechat_request_private_follow(uuid) to authenticated;
