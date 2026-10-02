-- Discord-only bridge for the transactional Gacha v2 RPC.
-- The public/user RPC remains bound to auth.uid(); Discord requests authenticate
-- at the application layer and arrive through the service-role Supabase client.

create or replace function public.bot_open_gacha_pack(
  p_discord_id text,
  p_transaction_id uuid,
  p_count integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid;
  v_role text := coalesce((select auth.jwt()->>'role'),'');
begin
  if current_user <> 'service_role' and v_role <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  if nullif(trim(p_discord_id),'') is null then
    raise exception 'DISCORD_ID_REQUIRED';
  end if;

  select id into v_uid
  from public.profiles
  where discord_id = p_discord_id
  limit 1;

  if v_uid is null then
    raise exception 'DISCORD_PROFILE_NOT_FOUND';
  end if;

  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  return public.open_gacha_pack(p_transaction_id, p_count);
end
$function$;

revoke all on function public.bot_open_gacha_pack(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.bot_open_gacha_pack(text, uuid, integer) to service_role;
