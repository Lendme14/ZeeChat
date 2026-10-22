-- Store new Stories in a private bucket; database row visibility alone cannot protect public media URLs.
alter table public.zeechat_stories add column if not exists media_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zeechat-private-stories',
  'zeechat-private-stories',
  false,
  31457280,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','video/ogg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their own ZeeChat private Stories" on storage.objects;
drop policy if exists "Users upload their own ZeeChat private Stories" on storage.objects;
drop policy if exists "Users delete their own ZeeChat private Stories" on storage.objects;
drop policy if exists "Authorized users read ZeeChat private Story media" on storage.objects;

create policy "Users upload their own ZeeChat private Stories"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'zeechat-private-stories'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own ZeeChat private Stories"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'zeechat-private-stories'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Authorized users read ZeeChat private Story media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'zeechat-private-stories'
    and exists (
      select 1
      from public.zeechat_stories s
      where s.media_path = storage.objects.name
        and s.expires_at > pg_catalog.now()
    )
  );
