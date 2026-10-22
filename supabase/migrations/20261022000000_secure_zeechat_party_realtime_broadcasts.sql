-- Restrict ZeeChat party signaling to authenticated hosts and RSVP'd members.
-- These policies apply only to private Broadcast channels used by the live party room.
drop policy if exists "ZeeChat party members can receive room broadcasts" on realtime.messages;
drop policy if exists "ZeeChat party members can send room broadcasts" on realtime.messages;

create policy "ZeeChat party members can receive room broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and realtime.topic() like 'zeechat-party-room-%'
  and exists (
    select 1
    from public.zeechat_parties p
    where p.id::text = substring(realtime.topic() from length('zeechat-party-room-') + 1)
      and p.status = 'live'
      and (
        p.host_id = (select auth.uid())
        or exists (
          select 1 from public.zeechat_party_members m
          where m.party_id = p.id and m.user_id = (select auth.uid())
        )
      )
  )
);

create policy "ZeeChat party members can send room broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and realtime.topic() like 'zeechat-party-room-%'
  and exists (
    select 1
    from public.zeechat_parties p
    where p.id::text = substring(realtime.topic() from length('zeechat-party-room-') + 1)
      and p.status = 'live'
      and (
        p.host_id = (select auth.uid())
        or exists (
          select 1 from public.zeechat_party_members m
          where m.party_id = p.id and m.user_id = (select auth.uid())
        )
      )
  )
);