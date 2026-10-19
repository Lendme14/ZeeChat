-- Prevent clients from recording views for posts they cannot read.
drop policy if exists "Record ZeeChat post views" on public.zeechat_post_views;
create policy "Record ZeeChat post views"
  on public.zeechat_post_views
  for insert to anon, authenticated
  with check (
    (viewer_id is null or viewer_id = (select auth.uid()))
    and exists (
      select 1
      from public.zeechat_posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.author_id = (select auth.uid())
          or (
            p.visibility = 'followers'
            and exists (
              select 1
              from public.zeechat_follows f
              where f.follower_id = (select auth.uid())
                and f.followed_id = p.author_id
            )
          )
        )
    )
  );
