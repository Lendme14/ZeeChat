-- Change account privacy and synchronize existing posts in one transaction.
create or replace function public.zeechat_set_account_privacy(p_is_private boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  update public.zeechat_profiles
  set is_private = p_is_private
  where user_id = actor;

  if not found then
    raise exception 'Profile not found';
  end if;

  update public.zeechat_posts
  set visibility = case when p_is_private then 'followers' else 'public' end
  where author_id = actor
    and visibility in ('public', 'followers');
end;
$$;

revoke all on function public.zeechat_set_account_privacy(boolean) from public, anon;
grant execute on function public.zeechat_set_account_privacy(boolean) to authenticated;
