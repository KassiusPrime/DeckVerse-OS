-- DeckVerse OS — admin catalog CMS foundation.
-- Keeps writes behind admin RPCs and adds search/bulk primitives for the Content Center.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.admin_search_catalog(
  p_query text default '',
  p_kind text default 'all',
  p_collection_id text default null,
  p_rarity text default null,
  p_letter text default null,
  p_limit integer default 300
)
returns table(
  scope text,
  entity_type text,
  id text,
  name text,
  synopsis text,
  description text,
  image_url text,
  collection_id text,
  collection_name text,
  base_name text,
  rarity text,
  is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  needle text := lower(trim(coalesce(p_query, '')));
  wanted_kind text := lower(trim(coalesce(p_kind, 'all')));
  wanted_letter text := lower(left(trim(coalesce(p_letter, '')), 1));
  safe_limit integer := least(300, greatest(20, coalesce(p_limit, 300)));
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if wanted_kind not in ('all','collection','character','boss','item','form') then raise exception 'INVALID_KIND'; end if;

  return query
  with catalog as (
    select 'collection'::text scope, 'collection'::text entity_type, c.id::text id, c.name,
      coalesce(c.synopsis,'') synopsis, coalesce(c.description,'') description,
      coalesce(c.cover_url,'') image_url, c.id::text collection_id, c.name collection_name,
      ''::text base_name, ''::text rarity, c.is_active
    from public.collections c
    where wanted_kind in ('all','collection')
      and (p_collection_id is null or c.id::text = p_collection_id)

    union all

    select 'card', c.entity_type, c.id::text, c.name,
      coalesce(c.synopsis,''), coalesce(c.description,''), coalesce(c.image_url,''),
      c.collection_id::text, coalesce(col.name,''), ''::text, coalesce(c.rarity,''), c.is_active
    from public.cards c
    left join public.collections col on col.id = c.collection_id
    where wanted_kind in ('all','character','boss','item')
      and (wanted_kind = 'all' or c.entity_type = wanted_kind)
      and (p_collection_id is null or c.collection_id::text = p_collection_id)

    union all

    select 'form', 'form', f.id::text, f.name,
      coalesce(f.synopsis,''), coalesce(f.description,''), coalesce(f.image_url,''),
      parent.collection_id::text, coalesce(col.name,''), coalesce(parent.name,''), coalesce(f.rarity,''), f.is_active
    from public.card_forms f
    join public.cards parent on parent.id = f.card_id
    left join public.collections col on col.id = parent.collection_id
    where wanted_kind in ('all','form')
      and (p_collection_id is null or parent.collection_id::text = p_collection_id)
  )
  select *
  from catalog c
  where (needle = '' or lower(c.name) like '%' || needle || '%' or lower(c.rarity) like '%' || needle || '%')
    and (p_rarity is null or trim(p_rarity) = '' or lower(c.rarity) = lower(trim(p_rarity)))
    and (wanted_letter = '' or lower(left(c.name,1)) = wanted_letter)
  order by lower(coalesce(c.collection_name,'')), lower(c.name), c.scope
  limit safe_limit;
end;
$$;

revoke all on function public.admin_search_catalog(text,text,text,text,text,integer) from public, anon;
grant execute on function public.admin_search_catalog(text,text,text,text,text,integer) to authenticated;

create or replace function public.admin_bulk_update_catalog(
  p_scope text,
  p_ids text[],
  p_synopsis text default null,
  p_is_active boolean default null,
  p_image_url text default null,
  p_rarity text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_scope text := lower(trim(coalesce(p_scope,'')));
  changed integer := 0;
  target text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if clean_scope not in ('collection','card','form') then raise exception 'INVALID_SCOPE'; end if;
  if coalesce(array_length(p_ids,1),0) = 0 then raise exception 'NO_IDS'; end if;
  if p_synopsis is not null and char_length(p_synopsis) > case when clean_scope = 'form' then 220 when clean_scope = 'collection' then 400 else 500 end then raise exception 'SYNOPSIS_LENGTH_INVALID'; end if;

  if clean_scope = 'collection' then
    update public.collections set
      synopsis = case when p_synopsis is null then synopsis else nullif(trim(p_synopsis),'') end,
      is_active = coalesce(p_is_active,is_active),
      cover_url = coalesce(nullif(trim(p_image_url),''),cover_url),
      updated_at = now()
    where id::text = any(p_ids);
    get diagnostics changed = row_count;
  elsif clean_scope = 'form' then
    update public.card_forms set
      synopsis = case when p_synopsis is null then synopsis else nullif(trim(p_synopsis),'') end,
      is_active = coalesce(p_is_active,is_active),
      image_url = coalesce(nullif(trim(p_image_url),''),image_url),
      rarity = coalesce(nullif(trim(p_rarity),''),rarity),
      updated_at = now()
    where id::text = any(p_ids);
    get diagnostics changed = row_count;
  else
    update public.cards set
      synopsis = case when p_synopsis is null then synopsis else nullif(trim(p_synopsis),'') end,
      is_active = coalesce(p_is_active,is_active),
      image_url = coalesce(nullif(trim(p_image_url),''),image_url),
      rarity = coalesce(nullif(trim(p_rarity),''),rarity),
      updated_at = now()
    where id::text = any(p_ids);
    get diagnostics changed = row_count;
  end if;

  target := 'catalog.bulk.' || clean_scope;
  insert into public.admin_audit_log(actor_profile_id, action, payload)
  values ((select auth.uid()), target, jsonb_build_object('ids',p_ids,'count',changed,'synopsis_changed',p_synopsis is not null,'active_changed',p_is_active is not null,'image_changed',p_image_url is not null,'rarity_changed',p_rarity is not null));

  return jsonb_build_object('ok',true,'scope',clean_scope,'changed',changed);
end;
$$;

revoke all on function public.admin_bulk_update_catalog(text,text[],text,boolean,text,text) from public, anon;
grant execute on function public.admin_bulk_update_catalog(text,text[],text,boolean,text,text) to authenticated;

commit;
