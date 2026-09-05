-- DeckVerse OS — admin-only synopsis editor
-- Keeps public catalog writes closed and exposes a narrow audited RPC to authenticated admins.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Recreate the admin profile search without the retired PWR field.
create or replace function public.admin_search_profiles(p_query text)
returns table(
  id uuid,
  discord_id text,
  discord_username text,
  display_name text,
  avatar_url text,
  role text,
  astral_shards bigint,
  ether_cores bigint,
  level integer,
  xp bigint,
  cosmic_luck numeric,
  pity_counter integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return query
  select p.id, p.discord_id, p.discord_username, p.display_name, p.avatar_url,
         p.role, p.astral_shards, p.ether_cores, p.level, p.xp, p.cosmic_luck, p.pity_counter
  from public.profiles p
  where coalesce(p_query, '') = ''
     or p.discord_id ilike '%' || p_query || '%'
     or p.discord_username ilike '%' || p_query || '%'
     or p.display_name ilike '%' || p_query || '%'
  order by coalesce(p.display_name, p.discord_username)
  limit 50;
end;
$$;
revoke all on function public.admin_search_profiles(text) from public, anon;
grant execute on function public.admin_search_profiles(text) to authenticated;

create or replace function public.admin_update_synopsis(
  p_scope text,
  p_id text,
  p_synopsis text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_scope text := lower(trim(coalesce(p_scope, '')));
  clean_synopsis text := trim(coalesce(p_synopsis, ''));
  old_synopsis text;
  entity_name text;
  entity_type text;
  min_len integer;
  max_len integer;
  new_len integer := char_length(clean_synopsis);
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if clean_scope not in ('collection', 'card', 'form') then raise exception 'INVALID_SCOPE'; end if;
  if nullif(trim(coalesce(p_id, '')), '') is null then raise exception 'ENTITY_ID_REQUIRED'; end if;

  if clean_scope = 'collection' then
    select synopsis, name into old_synopsis, entity_name
    from public.collections where id = p_id for update;
    if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
    entity_type := 'collection'; min_len := 350; max_len := 400;
  elsif clean_scope = 'form' then
    select synopsis, name into old_synopsis, entity_name
    from public.card_forms where id = p_id for update;
    if not found then raise exception 'FORM_NOT_FOUND'; end if;
    entity_type := 'form'; min_len := 180; max_len := 220;
  else
    select synopsis, name, entity_type into old_synopsis, entity_name, entity_type
    from public.cards where id = p_id for update;
    if not found then raise exception 'CARD_NOT_FOUND'; end if;
    if entity_type = 'character' then min_len := 220; max_len := 260;
    elsif entity_type = 'boss' then min_len := 250; max_len := 300;
    elsif entity_type = 'item' then min_len := 200; max_len := 240;
    else raise exception 'UNSUPPORTED_ENTITY_TYPE';
    end if;
  end if;

  if new_len < min_len or new_len > max_len then
    raise exception 'SYNOPSIS_LENGTH_INVALID:%:%:%', new_len, min_len, max_len;
  end if;

  if clean_scope = 'collection' then
    update public.collections set synopsis = clean_synopsis, updated_at = now() where id = p_id;
  elsif clean_scope = 'form' then
    update public.card_forms set synopsis = clean_synopsis, updated_at = now() where id = p_id;
  else
    update public.cards set synopsis = clean_synopsis, updated_at = now() where id = p_id;
  end if;

  insert into public.admin_audit_log(actor_profile_id, action, payload)
  values(
    actor,
    case when old_synopsis is null or trim(old_synopsis) = '' then 'catalog.synopsis.create' else 'catalog.synopsis.update' end,
    jsonb_build_object(
      'scope', clean_scope,
      'entity_id', p_id,
      'entity_name', entity_name,
      'entity_type', entity_type,
      'old_length', coalesce(char_length(old_synopsis), 0),
      'new_length', new_len
    )
  );

  return jsonb_build_object(
    'ok', true,
    'scope', clean_scope,
    'id', p_id,
    'name', entity_name,
    'entity_type', entity_type,
    'synopsis', clean_synopsis,
    'length', new_len
  );
end;
$$;
revoke all on function public.admin_update_synopsis(text, text, text) from public, anon;
grant execute on function public.admin_update_synopsis(text, text, text) to authenticated;

comment on function public.admin_update_synopsis(text, text, text)
is 'Admin-only audited synopsis create/update endpoint for collection, card and form records.';

commit;
