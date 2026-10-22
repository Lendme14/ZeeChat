create table if not exists public.zeechat_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  messages boolean not null default true,
  follows boolean not null default true,
  comments boolean not null default true,
  likes boolean not null default true,
  community boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.zeechat_notification_preferences enable row level security;

drop policy if exists "Users can read their own notification preferences" on public.zeechat_notification_preferences;
create policy "Users can read their own notification preferences"
  on public.zeechat_notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own notification preferences" on public.zeechat_notification_preferences;
create policy "Users can create their own notification preferences"
  on public.zeechat_notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own notification preferences" on public.zeechat_notification_preferences;
create policy "Users can update their own notification preferences"
  on public.zeechat_notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.zeechat_notification_preferences to authenticated;
