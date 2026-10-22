alter table public.zeechat_messages
  add column if not exists reply_to_id uuid null
  references public.zeechat_messages(id) on delete set null;

create index if not exists zeechat_messages_reply_to_id_idx
  on public.zeechat_messages (reply_to_id)
  where reply_to_id is not null;
