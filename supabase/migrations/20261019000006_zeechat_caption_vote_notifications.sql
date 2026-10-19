-- Add notifications when someone votes for a Caption Battle entry.
alter table public.zeechat_notifications
  drop constraint if exists zeechat_notifications_kind_check;

alter table public.zeechat_notifications
  add constraint zeechat_notifications_kind_check
  check (kind in ('message','follow','comment','like','caption_vote'));

create or replace function private.zeechat_notify_caption_battle_vote()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  entry_author uuid;
  actor_name text;
begin
  select author_id into entry_author
  from public.zeechat_caption_battles
  where id = new.entry_id;

  if entry_author is null or entry_author = new.voter_id then
    return new;
  end if;

  select coalesce(display_name, username, 'Someone') into actor_name
  from public.zeechat_profiles
  where user_id = new.voter_id;

  perform private.zeechat_create_notification(
    entry_author,
    new.voter_id,
    'caption_vote',
    coalesce(actor_name, 'Someone') || ' voted for your caption',
    'Your Caption Battle entry just got a vote. Jump back in and see how it ranks!',
    new.entry_id,
    new.id
  );

  return new;
end;
$$;

revoke all on function private.zeechat_notify_caption_battle_vote() from public, anon, authenticated;

drop trigger if exists zeechat_notify_caption_battle_vote on public.zeechat_caption_battle_votes;
create trigger zeechat_notify_caption_battle_vote
after insert on public.zeechat_caption_battle_votes
for each row execute function private.zeechat_notify_caption_battle_vote();
