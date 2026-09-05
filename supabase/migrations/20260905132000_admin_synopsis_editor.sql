-- DeckVerse OS — admin-only synopsis editor
-- Keeps public catalog writes closed and exposes a narrow audited RPC to authenticated admins.
-- Safe to apply before the wider lore-first/stat-removal migration.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.collections add column if not exists synopsis text;
alter table public.cards add column if not exists synopsis text;
alter table public.card_forms add column if not exists synopsis text;

alter table public.collections drop constraint if exists collections_synopsis_length_ck;
alter table public.collections add constraint collections_synopsis_length_ck
  check (synopsis is null or char_length(synopsis) between 350 and 400) not valid;

alter table public.cards drop constraint if exists cards_synopsis_length_ck;
alter table public.cards add constraint cards_synopsis_length_ck
  check (
    synopsis is null or
    (entity_type = 'character' and char_length(synopsis) between 220 and 260) or
    (entity_type = 'boss' and char_length(synopsis) between 250 and 300) or
    (entity_type = 'item' and char_length(synopsis) between 200 and 240)
  ) not valid;

alter table public.card_forms drop constraint if exists card_forms_synopsis_length_ck;
alter table public.card_forms add constraint card_forms_synopsis_length_ck
  check (synopsis is null or char_length(synopsis) between 180 and 220) not valid;

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
  target_type text;
  min_len integer;
  max_len integer;
  new_len integer := char_length(clean_synopsis);
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if clean_scope not in ('collection', 'card', 'form') then raise exception 'INVALID_SCOPE'; end if;
  if nullif(trim(coalesce(p_id, '')), '') is null then raise exception 'ENTITY_ID_REQUIRED'; end if;

  if clean_scope = 'collection' then
    select c.synopsis, c.name into old_synopsis, entity_name
    from public.collections c where c.id = p_id for update;
    if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
    target_type := 'collection'; min_len := 350; max_len := 400;
  elsif clean_scope = 'form' then
    select f.synopsis, f.name into old_synopsis, entity_name
    from public.card_forms f where f.id = p_id for update;
    if not found then raise exception 'FORM_NOT_FOUND'; end if;
    target_type := 'form'; min_len := 180; max_len := 220;
  else
    select c.synopsis, c.name, c.entity_type into old_synopsis, entity_name, target_type
    from public.cards c where c.id = p_id for update;
    if not found then raise exception 'CARD_NOT_FOUND'; end if;
    if target_type = 'character' then min_len := 220; max_len := 260;
    elsif target_type = 'boss' then min_len := 250; max_len := 300;
    elsif target_type = 'item' then min_len := 200; max_len := 240;
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
      'entity_type', target_type,
      'old_length', coalesce(char_length(old_synopsis), 0),
      'new_length', new_len
    )
  );

  return jsonb_build_object(
    'ok', true,
    'scope', clean_scope,
    'id', p_id,
    'name', entity_name,
    'entity_type', target_type,
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
