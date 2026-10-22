-- Private-account Stories are visible only to the owner and approved followers.
drop policy if exists "Authenticated users can view active ZeeChat stories" on public.zeechat_stories;
create policy "View active stories allowed by account privacy"
  on public.zeechat_stories for select to authenticated
  using (
    expires_at > pg_catalog.now()
    and (
      user_id = (select auth.uid())
      or exists (
        select 1
        from public.zeechat_profiles p
        where p.user_id = zeechat_stories.user_id
          and (
            p.is_private = false
            or exists (
              select 1
              from public.zeechat_follows f
              where f.follower_id = (select auth.uid())
                and f.followed_id = zeechat_stories.user_id
            )
          )
      )
    )
  );
