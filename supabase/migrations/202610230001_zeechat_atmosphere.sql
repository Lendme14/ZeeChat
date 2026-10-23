-- ZChat Atmosphere: per-user preferences and opt-in creator location.
-- Coordinates are only saved when the creator explicitly enables location for a post.
create table if not exists public.zeechat_atmosphere_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  mode text not null default 'viewer' check (mode in ('creator','viewer')),
  show_on_own_reels boolean not null default true,
  location_permission_granted boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.zeechat_atmosphere_preferences enable row level security;
drop policy if exists "Users read their own atmosphere preferences" on public.zeechat_atmosphere_preferences;
create policy "Users read their own atmosphere preferences"
  on public.zeechat_atmosphere_preferences for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users create their own atmosphere preferences" on public.zeechat_atmosphere_preferences;
create policy "Users create their own atmosphere preferences"
  on public.zeechat_atmosphere_preferences for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users update their own atmosphere preferences" on public.zeechat_atmosphere_preferences;
create policy "Users update their own atmosphere preferences"
  on public.zeechat_atmosphere_preferences for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.zeechat_posts
  add column if not exists atmosphere_location_enabled boolean not null default false,
  add column if not exists atmosphere_latitude double precision,
  add column if not exists atmosphere_longitude double precision,
  add column if not exists atmosphere_location_label text;

alter table public.zeechat_posts
  drop constraint if exists zeechat_posts_atmosphere_coordinates_check;
alter table public.zeechat_posts
  add constraint zeechat_posts_atmosphere_coordinates_check
  check (
    (atmosphere_location_enabled = false and atmosphere_latitude is null and atmosphere_longitude is null)
    or
    (atmosphere_location_enabled = true
      and atmosphere_latitude between -90 and 90
      and atmosphere_longitude between -180 and 180)
  );

comment on column public.zeechat_posts.atmosphere_location_enabled is
  'Creator explicitly opted to use this post location for live ZChat Atmosphere weather.';
