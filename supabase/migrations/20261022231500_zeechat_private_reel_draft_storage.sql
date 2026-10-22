-- Keep unpublished Reel media private rather than placing it in the public media bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zeechat-private-drafts', 'zeechat-private-drafts', false, 104857600, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users manage their own ZeeChat private drafts" on storage.objects;
create policy "Users read their own ZeeChat private drafts"
  on storage.objects for select to authenticated
  using (bucket_id = 'zeechat-private-drafts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload their own ZeeChat private drafts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'zeechat-private-drafts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete their own ZeeChat private drafts"
  on storage.objects for delete to authenticated
  using (bucket_id = 'zeechat-private-drafts' and (storage.foldername(name))[1] = auth.uid()::text);
