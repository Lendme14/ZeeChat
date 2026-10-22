-- Add private storage paths for ZeeChat post and Reel media.
-- Existing public URLs remain supported until a separate migration/backfill is completed.
alter table public.zeechat_posts
  add column if not exists media_path text,
  add column if not exists thumbnail_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zeechat-private-posts',
  'zeechat-private-posts',
  false,
  104857600,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime','video/ogg'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ZeeChat private post media is visible to authorized viewers" on storage.objects;
create policy "ZeeChat private post media is visible to authorized viewers"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'zeechat-private-posts'
  and exists (
    select 1
    from public.zeechat_posts p
    join public.zeechat_profiles owner_profile on owner_profile.user_id = p.author_id
    where (p.media_path = storage.objects.name or p.thumbnail_path = storage.objects.name)
      and (
        p.author_id = (select auth.uid())
        or (
          p.visibility = 'public'
          and owner_profile.is_private = false
        )
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

drop policy if exists "Users upload their own ZeeChat private post media" on storage.objects;
create policy "Users upload their own ZeeChat private post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'zeechat-private-posts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update their own ZeeChat private post media" on storage.objects;
create policy "Users update their own ZeeChat private post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'zeechat-private-posts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'zeechat-private-posts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete their own ZeeChat private post media" on storage.objects;
create policy "Users delete their own ZeeChat private post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'zeechat-private-posts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
