-- Public images for ZeeChat posts. Additive; does not modify Zonix-owned tables.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zeechat-media', 'zeechat-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ZeeChat public media is readable" on storage.objects;
create policy "ZeeChat public media is readable" on storage.objects for select using (bucket_id = 'zeechat-media');

drop policy if exists "Users upload their own ZeeChat media" on storage.objects;
create policy "Users upload their own ZeeChat media" on storage.objects for insert to authenticated with check (bucket_id = 'zeechat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own ZeeChat media" on storage.objects;
create policy "Users delete their own ZeeChat media" on storage.objects for delete to authenticated using (bucket_id = 'zeechat-media' and (storage.foldername(name))[1] = auth.uid()::text);
