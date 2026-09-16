begin;

-- Production hardening applied after the catalog editor rollout.
-- Keep the catalog search RPC callable only by signed-in users; the function
-- itself additionally requires an active admin via app_private.is_admin().
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
language sql
security definer
set search_path = ''
as 'select * from (
  select ''collection''::text scope, ''collection''::text entity_type, c.id::text id, c.name::text name,
    coalesce(c.synopsis,'''') synopsis, coalesce(c.description,'''') description, coalesce(c.cover_url,'''') image_url,
    c.id::text collection_id, c.name::text collection_name, ''''::text base_name, ''''::text rarity, c.is_active
  from public.collections c
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,''all'')) in (''all'',''collection'')
    and (nullif(trim(coalesce(p_query,'''')),'''') is null or c.name ilike ''%''||nullif(trim(coalesce(p_query,'''')),'''')||''%'')
    and (nullif(trim(coalesce(p_letter,'''')),'''') is null or lower(left(c.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.id::text=p_collection_id)
  union all
  select ''card'', c.entity_type::text, c.id::text, c.name::text, coalesce(c.synopsis,''''), coalesce(c.description,''''), coalesce(c.image_url,''''),
    c.collection_id::text, coalesce(col.name,''''), ''''::text, coalesce(c.rarity,''''), c.is_active
  from public.cards c left join public.collections col on col.id=c.collection_id
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,''all'')) in (''all'',''character'',''item'',''boss'')
    and (lower(coalesce(p_kind,''all''))=''all'' or c.entity_type=lower(p_kind))
    and (nullif(trim(coalesce(p_query,'''')),'''') is null or c.name ilike ''%''||nullif(trim(coalesce(p_query,'''')),'''')||''%'' or coalesce(c.rarity,'''') ilike ''%''||nullif(trim(coalesce(p_query,'''')),'''')||''%'')
    and (nullif(trim(coalesce(p_letter,'''')),'''') is null or lower(left(c.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.collection_id::text=p_collection_id)
    and (p_rarity is null or c.rarity=p_rarity)
  union all
  select ''form'', ''form'', f.id::text, f.name::text, coalesce(f.synopsis,''''), coalesce(f.description,''''), coalesce(f.image_url,''''),
    c.collection_id::text, coalesce(col.name,''''), coalesce(c.name,''''), coalesce(f.rarity,''''), f.is_active
  from public.card_forms f join public.cards c on c.id=f.card_id left join public.collections col on col.id=c.collection_id
  where auth.uid() is not null and app_private.is_admin()
    and lower(coalesce(p_kind,''all'')) in (''all'',''form'')
    and (nullif(trim(coalesce(p_query,'''')),'''') is null or f.name ilike ''%''||nullif(trim(coalesce(p_query,'''')),'''')||''%'' or coalesce(f.rarity,'''') ilike ''%''||nullif(trim(coalesce(p_query,'''')),'''')||''%'')
    and (nullif(trim(coalesce(p_letter,'''')),'''') is null or lower(left(f.name,1))=lower(left(trim(p_letter),1)))
    and (p_collection_id is null or c.collection_id::text=p_collection_id)
    and (p_rarity is null or f.rarity=p_rarity)
) q order by collection_name collate "C", name collate "C" limit least(greatest(coalesce(p_limit,300),20),300)';

revoke all on function public.admin_search_catalog(text,text,text,text,text,integer) from public, anon;
grant execute on function public.admin_search_catalog(text,text,text,text,text,integer) to authenticated;
revoke all on function public.admin_patch_profile(uuid,text,text,integer) from public, anon;
grant execute on function public.admin_patch_profile(uuid,text,text,integer) to authenticated;

commit;
