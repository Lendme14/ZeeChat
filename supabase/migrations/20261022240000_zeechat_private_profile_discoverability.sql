-- Private accounts remain discoverable by profile metadata; their posts stay protected by the post RLS policy.
drop policy if exists "ZeeChat profiles are readable" on public.zeechat_profiles;
create policy "ZeeChat profile headers are readable"
  on public.zeechat_profiles for select to anon, authenticated
  using (true);
