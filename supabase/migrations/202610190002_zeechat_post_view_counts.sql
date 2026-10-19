-- Aggregate view totals in PostgreSQL instead of downloading every view row.
-- SECURITY INVOKER preserves the caller's RLS visibility on ZeeChat posts.
create or replace function public.zeechat_post_view_counts(post_ids uuid[])
returns table (post_id uuid, view_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id as post_id, count(v.id) as view_count
  from public.zeechat_posts p
  left join public.zeechat_post_views v on v.post_id = p.id
  where p.id = any(post_ids)
  group by p.id;
$$;

revoke all on function public.zeechat_post_view_counts(uuid[]) from public;
grant execute on function public.zeechat_post_view_counts(uuid[]) to anon, authenticated;
