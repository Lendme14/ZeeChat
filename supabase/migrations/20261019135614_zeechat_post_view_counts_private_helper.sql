-- Keep view-row access private while exposing only safe aggregate counts.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.zeechat_post_view_counts_internal(post_ids uuid[])
returns table (post_id uuid, view_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id as post_id, count(v.id) as view_count
  from public.zeechat_posts p
  left join public.zeechat_post_views v on v.post_id = p.id
  where p.id = any(post_ids)
    and (
      p.visibility = 'public'
      or p.author_id = (select auth.uid())
      or (
        p.visibility = 'followers'
        and exists (
          select 1 from public.zeechat_follows f
          where f.follower_id = (select auth.uid())
            and f.followed_id = p.author_id
        )
      )
    )
  group by p.id;
$$;

revoke all on function private.zeechat_post_view_counts_internal(uuid[]) from public;
grant execute on function private.zeechat_post_view_counts_internal(uuid[]) to anon, authenticated;

create or replace function public.zeechat_post_view_counts(post_ids uuid[])
returns table (post_id uuid, view_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.zeechat_post_view_counts_internal(post_ids);
$$;

revoke all on function public.zeechat_post_view_counts(uuid[]) from public;
grant execute on function public.zeechat_post_view_counts(uuid[]) to anon, authenticated;
