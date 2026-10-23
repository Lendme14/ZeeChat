-- Private direct-message media. Files are accessible only to members of the conversation.
alter table public.zeechat_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zeechat-chat-media',
  'zeechat-chat-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Chat members can read message media" on storage.objects;
create policy "Chat members can read message media"
on storage.objects for select to authenticated
using (
  bucket_id = 'zeechat-chat-media'
  and exists (
    select 1
    from public.zeechat_messages m
    join public.zeechat_conversation_members cm on cm.conversation_id = m.conversation_id
    where m.attachment_path = storage.objects.name
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Chat members can upload message media" on storage.objects;
create policy "Chat members can upload message media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'zeechat-chat-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.zeechat_conversation_members cm
    where cm.conversation_id::text = (storage.foldername(name))[2]
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners can delete their message media" on storage.objects;
create policy "Owners can delete their message media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'zeechat-chat-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
