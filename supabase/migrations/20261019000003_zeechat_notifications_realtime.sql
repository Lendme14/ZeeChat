create table if not exists public.zeechat_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('message','follow','comment','like')),
  title text not null,
  body text not null,
  entity_id uuid,
  source_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists zeechat_notifications_recipient_unread_idx
  on public.zeechat_notifications (recipient_id, created_at desc)
  where read_at is null;
create index if not exists zeechat_notifications_recipient_created_idx
  on public.zeechat_notifications (recipient_id, created_at desc);

alter table public.zeechat_notifications enable row level security;
drop policy if exists "Users read their own notifications" on public.zeechat_notifications;
create policy "Users read their own notifications"
  on public.zeechat_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
drop policy if exists "Users mark their own notifications read" on public.zeechat_notifications;
create policy "Users mark their own notifications read"
  on public.zeechat_notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
grant select on public.zeechat_notifications to authenticated;
grant update (read_at) on public.zeechat_notifications to authenticated;

drop policy if exists "Recipients can mark messages read" on public.zeechat_messages;
create policy "Recipients can mark messages read"
  on public.zeechat_messages for update to authenticated
  using (sender_id <> (select auth.uid()) and private.zeechat_is_conversation_member(conversation_id, (select auth.uid())))
  with check (sender_id <> (select auth.uid()) and private.zeechat_is_conversation_member(conversation_id, (select auth.uid())));
grant update (read_at) on public.zeechat_messages to authenticated;

create or replace function private.zeechat_create_notification(
  p_recipient_id uuid, p_actor_id uuid, p_kind text, p_title text, p_body text,
  p_entity_id uuid default null, p_source_id uuid default null
) returns void
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  if p_recipient_id is null or p_actor_id is null or p_recipient_id = p_actor_id then return; end if;
  insert into public.zeechat_notifications (recipient_id, actor_id, kind, title, body, entity_id, source_id)
  values (p_recipient_id, p_actor_id, p_kind, left(coalesce(p_title, 'New activity'), 160),
    left(coalesce(p_body, 'You have new activity on ZeeChat.'), 240), p_entity_id, p_source_id);
end;
$$;
revoke all on function private.zeechat_create_notification(uuid,uuid,text,text,text,uuid,uuid) from public, anon, authenticated;

create or replace function private.zeechat_notify_new_message()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
begin
  insert into public.zeechat_notifications (recipient_id, actor_id, kind, title, body, entity_id, source_id)
  select member.user_id, new.sender_id, 'message', 'New message', 'You received a new message.', new.conversation_id, new.id
  from public.zeechat_conversation_members member
  where member.conversation_id = new.conversation_id and member.user_id <> new.sender_id;
  return new;
end;
$$;
revoke all on function private.zeechat_notify_new_message() from public, anon, authenticated;
drop trigger if exists zeechat_notify_new_message on public.zeechat_messages;
create trigger zeechat_notify_new_message after insert on public.zeechat_messages
for each row execute function private.zeechat_notify_new_message();

create or replace function private.zeechat_notify_new_follow()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare actor_name text;
begin
  select coalesce(display_name, username, 'Someone') into actor_name from public.zeechat_profiles where user_id = new.follower_id;
  perform private.zeechat_create_notification(new.followed_id, new.follower_id, 'follow',
    coalesce(actor_name, 'Someone') || ' followed you', 'You have a new follower.', null, null);
  return new;
end;
$$;
revoke all on function private.zeechat_notify_new_follow() from public, anon, authenticated;
drop trigger if exists zeechat_notify_new_follow on public.zeechat_follows;
create trigger zeechat_notify_new_follow after insert on public.zeechat_follows
for each row execute function private.zeechat_notify_new_follow();

create or replace function private.zeechat_notify_new_comment()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare post_owner uuid; actor_name text;
begin
  select author_id into post_owner from public.zeechat_posts where id = new.post_id;
  select coalesce(display_name, username, 'Someone') into actor_name from public.zeechat_profiles where user_id = new.author_id;
  if post_owner is not null and post_owner <> new.author_id then
    perform private.zeechat_create_notification(post_owner, new.author_id, 'comment',
      coalesce(actor_name, 'Someone') || ' commented on your post',
      left(coalesce(new.body, 'You have a new comment.'), 200), new.post_id, new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.zeechat_notify_new_comment() from public, anon, authenticated;
drop trigger if exists zeechat_notify_new_comment on public.zeechat_comments;
create trigger zeechat_notify_new_comment after insert on public.zeechat_comments
for each row execute function private.zeechat_notify_new_comment();

create or replace function private.zeechat_notify_new_like()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare post_owner uuid; actor_name text;
begin
  select author_id into post_owner from public.zeechat_posts where id = new.post_id;
  select coalesce(display_name, username, 'Someone') into actor_name from public.zeechat_profiles where user_id = new.user_id;
  if post_owner is not null and post_owner <> new.user_id then
    perform private.zeechat_create_notification(post_owner, new.user_id, 'like',
      coalesce(actor_name, 'Someone') || ' liked your post', 'Someone liked your post.', new.post_id, new.post_id);
  end if;
  return new;
end;
$$;
revoke all on function private.zeechat_notify_new_like() from public, anon, authenticated;
drop trigger if exists zeechat_notify_new_like on public.zeechat_post_likes;
create trigger zeechat_notify_new_like after insert on public.zeechat_post_likes
for each row execute function private.zeechat_notify_new_like();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'zeechat_notifications') then
    alter publication supabase_realtime add table public.zeechat_notifications;
  end if;
end $$;
