-- Acervo server-side pagination and atomic status updates.
drop function if exists public.admin_search_catalog_paginated(text,text,text,text,text,integer,integer);

create function public.admin_search_catalog_paginated(
  p_query text default '',
  p_kind text default 'all',
  p_collection_id text default null,
  p_rarity text default null,
  p_letter text default null,
  p_is_active boolean default null,
  p_limit integer default 48,
  p_offset integer default 0
)
returns jsonb
language sql
security definer
set search_path to ''
as $$
with base as (
  select 'collection'::text scope,'collection'::text entity_type,c.id::text id,c.name::text name,
    coalesce(c.synopsis,'') synopsis,coalesce(c.description,'') description,coalesce(c.cover_url,'') image_url,
    c.id::text collection_id,c.name::text collection_name,''::text base_name,''::text rarity,c.is_active
  from public.collections c
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,'all')) in ('all','collection')
    and (nullif(trim(coalesce(p_query,'')),'') is null or c.name ilike '%'||nullif(trim(coalesce(p_query,'')),'')||'%')
    and (nullif(trim(coalesce(p_letter,'')),'') is null or lower(left(c.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.id::text=p_collection_id)
    and (p_is_active is null or c.is_active=p_is_active)
  union all
  select 'card',c.entity_type::text,c.id::text,c.name::text,coalesce(c.synopsis,''),coalesce(c.description,''),coalesce(c.image_url,''),
    c.collection_id::text,coalesce(col.name,''),''::text,coalesce(c.rarity,''),c.is_active
  from public.cards c left join public.collections col on col.id=c.collection_id
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,'all')) in ('all','character','item','boss')
    and (lower(coalesce(p_kind,'all'))='all' or c.entity_type=lower(p_kind))
    and (nullif(trim(coalesce(p_query,'')),'') is null or c.name ilike '%'||nullif(trim(coalesce(p_query,'')),'')||'%' or coalesce(c.rarity,'') ilike '%'||nullif(trim(coalesce(p_query,'')),'')||'%')
    and (nullif(trim(coalesce(p_letter,'')),'') is null or lower(left(c.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.collection_id::text=p_collection_id)
    and (p_rarity is null or c.rarity=p_rarity)
    and (p_is_active is null or c.is_active=p_is_active)
  union all
  select 'form','form',f.id::text,f.name::text,coalesce(f.synopsis,''),coalesce(f.description,''),coalesce(f.image_url,''),
    c.collection_id::text,coalesce(col.name,''),coalesce(c.name,''),coalesce(f.rarity,''),f.is_active
  from public.card_forms f join public.cards c on c.id=f.card_id left join public.collections col on col.id=c.collection_id
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,'all'))='form'
    and (nullif(trim(coalesce(p_query,'')),'') is null or f.name ilike '%'||nullif(trim(coalesce(p_query,'')),'')||'%' or coalesce(f.rarity,'') ilike '%'||nullif(trim(coalesce(p_query,'')),'')||'%')
    and (nullif(trim(coalesce(p_letter,'')),'') is null or lower(left(f.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.collection_id::text=p_collection_id)
    and (p_rarity is null or f.rarity=p_rarity)
    and (p_is_active is null or f.is_active=p_is_active)
),
page as (
  select * from base order by collection_name collate "C", name collate "C"
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,48),1),100)
)
select jsonb_build_object(
  'rows', coalesce((select jsonb_agg(to_jsonb(page) order by collection_name collate "C", name collate "C") from page),'[]'::jsonb),
  'total',(select count(*) from base)
);
$$;

create or replace function public.admin_bulk_set_acervo_status(p_entries jsonb,p_is_active boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare actor uuid := (select auth.uid()); item jsonb; scope text; id text; changed integer := 0;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries)=0 then return jsonb_build_object('ok',true,'updated',0); end if;
  for item in select * from jsonb_array_elements(p_entries) loop
    scope := lower(trim(coalesce(item->>'scope',''))); id := nullif(trim(coalesce(item->>'id','')),'');
    if scope not in ('card','form') or id is null then raise exception 'INVALID_ENTRY'; end if;
    if scope='card' then
      update public.cards set is_active=p_is_active,updated_at=now() where cards.id=id;
      if not found then raise exception 'CARD_NOT_FOUND'; end if;
    else
      update public.card_forms set is_active=p_is_active,updated_at=now() where card_forms.id=id;
      if not found then raise exception 'FORM_NOT_FOUND'; end if;
    end if;
    changed := changed + 1;
  end loop;
  insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.bulk_status',jsonb_build_object('entries',p_entries,'is_active',p_is_active,'updated',changed));
  return jsonb_build_object('ok',true,'updated',changed);
end;
$$;

revoke execute on function public.admin_search_catalog_paginated(text,text,text,text,text,boolean,integer,integer) from public,anon;
revoke execute on function public.admin_bulk_set_acervo_status(jsonb,boolean) from public,anon;
grant execute on function public.admin_search_catalog_paginated(text,text,text,text,text,boolean,integer,integer) to authenticated;
grant execute on function public.admin_bulk_set_acervo_status(jsonb,boolean) to authenticated;
