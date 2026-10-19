-- Restrict the conversation creation RPC to authenticated users.
-- The function validates auth.uid() internally and is intentionally callable by signed-in clients.
revoke execute on function public.zeechat_start_conversation(uuid) from public, anon;
grant execute on function public.zeechat_start_conversation(uuid) to authenticated, service_role;
