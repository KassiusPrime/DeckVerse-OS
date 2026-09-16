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
  scope text, entity_type text, id text, name text, synopsis text, description text,
  image_url text, collection_id text, collection_name text, base_name text, rarity text, is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); needle text := nullif(trim(coalesce(p_query,'')), ''); letter text := nullif(lower(left(trim(coalesce(p_letter,'')),1)), '');
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if lower(coalesce(p_kind,'all')) not in ('all','collection','character','item','boss','form') then raise exception 'INVALID_KIND'; end if;
  return query
  with all_rows as (
    select 'collection'::text scope, 'collection'::text entity_type, c.id::text id, c.name::text name,
      coalesce(c.synopsis,'') synopsis, coalesce(c.description,'') description, coalesce(c.cover_url,'') image_url,
      c.id::text collection_id, c.name::text collection_name, ''::text base_name, ''::text rarity, c.is_active
    from public.collections c
    where lower(coalesce(p_kind,'all')) in ('all','collection')
      and (needle is null or c.name ilike '%'||needle||'%')
      and (letter is null or lower(left(c.name,1)) = letter)
      and (p_collection_id is null or c.id::text = p_collection_id)
    union all
    select 'card', c.entity_type::text, c.id::text, c.name::text, coalesce(c.synopsis,''), coalesce(c.description,''), coalesce(c.image_url,''),
      c.collection_id::text, coalesce(col.name,''), ''::text, coalesce(c.rarity,''), c.is_active
    from public.cards c left join public.collections col on col.id = c.collection_id
    where lower(coalesce(p_kind,'all')) in ('all','character','item','boss')
      and (lower(coalesce(p_kind,'all')) = 'all' or c.entity_type = lower(p_kind))
      and (needle is null or c.name ilike '%'||needle||'%' or coalesce(c.rarity,'') ilike '%'||needle||'%')
      and (letter is null or lower(left(c.name,1)) = letter)
      and (p_collection_id is null or c.collection_id::text = p_collection_id)
      and (p_rarity is null or c.rarity = p_rarity)
    union all
    select 'form', 'form', f.id::text, f.name::text, coalesce(f.synopsis,''), coalesce(f.description,''), coalesce(f.image_url,''),
      c.collection_id::text, coalesce(col.name,''), coalesce(c.name,''), coalesce(f.rarity,''), f.is_active
    from public.card_forms f join public.cards c on c.id = f.card_id left join public.collections col on col.id = c.collection_id
    where lower(coalesce(p_kind,'all')) in ('all','form')
      and (needle is null or f.name ilike '%'||needle||'%' or coalesce(f.rarity,'') ilike '%'||needle||'%')
      and (letter is null or lower(left(f.name,1)) = letter)
      and (p_collection_id is null or c.collection_id::text = p_collection_id)
      and (p_rarity is null or f.rarity = p_rarity)
  )
  select * from all_rows order by collection_name collate "C", name collate "C" limit least(greatest(coalesce(p_limit,300),20),300);
end;
$$;

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
declare actor uuid := auth.uid(); changed integer := 0; clean_synopsis text := nullif(trim(coalesce(p_synopsis,'')), ''); clean_scope text := lower(trim(coalesce(p_scope,'')));
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if clean_scope not in ('collection','card','form') then raise exception 'INVALID_SCOPE'; end if;
  if coalesce(array_length(p_ids,1),0) = 0 then raise exception 'NO_TARGETS'; end if;
  if array_length(p_ids,1) > 300 then raise exception 'TOO_MANY_TARGETS'; end if;
  if clean_synopsis is not null and char_length(clean_synopsis) > case when clean_scope='collection' then 400 when clean_scope='form' then 220 else 500 end then raise exception 'SYNOPSIS_LENGTH_INVALID'; end if;

  if clean_scope = 'collection' then
    update public.collections set synopsis = coalesce(p_synopsis::text, synopsis), is_active = coalesce(p_is_active,is_active), cover_url = case when p_image_url is null then cover_url else p_image_url end, updated_at=now() where id::text = any(p_ids);
  elsif clean_scope = 'form' then
    update public.card_forms set synopsis = case when p_synopsis is null then synopsis else clean_synopsis end, is_active=coalesce(p_is_active,is_active), image_url=case when p_image_url is null then image_url else p_image_url end, updated_at=now() where id::text=any(p_ids);
  else
    update public.cards set synopsis=case when p_synopsis is null then synopsis else clean_synopsis end, is_active=coalesce(p_is_active,is_active), image_url=case when p_image_url is null then image_url else p_image_url end, rarity=case when p_rarity is null then rarity else p_rarity end, updated_at=now() where id::text=any(p_ids);
  end if;
  get diagnostics changed = row_count;
  insert into public.admin_audit_log(actor_profile_id, action, payload) values(actor,'catalog.bulk_update',jsonb_build_object('scope',clean_scope,'ids',p_ids,'changed',changed));
  return jsonb_build_object('ok',true,'changed',changed,'scope',clean_scope);
end;
$$;

revoke all on function public.admin_search_catalog(text,text,text,text,text,integer) from public, anon;
grant execute on function public.admin_search_catalog(text,text,text,text,text,integer) to authenticated;
revoke all on function public.admin_bulk_update_catalog(text,text[],text,boolean,text,text) from public, anon;
grant execute on function public.admin_bulk_update_catalog(text,text[],text,boolean,text,text) to authenticated;
commit;
