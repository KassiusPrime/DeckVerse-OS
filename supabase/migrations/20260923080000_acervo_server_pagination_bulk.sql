-- Acervo server-side pagination, atomic status updates, and complete dependency checks.
drop function if exists public.admin_search_catalog_paginated(text,text,text,text,text,boolean,integer,integer);

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
    and (nullif(trim(coalesce(p_letter,'')),'') is null or (trim(p_letter)='#' and left(c.name,1) ~ '[0-9]') or (trim(p_letter)<>'#' and lower(left(c.name,1))=lower(left(trim(p_letter),1))))
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
    and (nullif(trim(coalesce(p_letter,'')),'') is null or (trim(p_letter)='#' and left(c.name,1) ~ '[0-9]') or (trim(p_letter)<>'#' and lower(left(c.name,1))=lower(left(trim(p_letter),1))))
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
    and (nullif(trim(coalesce(p_letter,'')),'') is null or (trim(p_letter)='#' and left(f.name,1) ~ '[0-9]') or (trim(p_letter)<>'#' and lower(left(f.name,1))=lower(left(trim(p_letter),1))))
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
returns jsonb language plpgsql security definer set search_path to ''
as $acervo$
declare actor uuid := auth.uid(); item jsonb; scope text; id text; changed integer := 0;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries)=0 then return jsonb_build_object('ok',true,'updated',0); end if;
 for item in select * from jsonb_array_elements(p_entries) loop
   scope:=lower(trim(coalesce(item->>'scope',''))); id:=nullif(trim(coalesce(item->>'id','')),'');
   if scope not in ('card','form') or id is null then raise exception 'INVALID_ENTRY'; end if;
   if scope='card' then
     update public.cards set is_active=p_is_active,updated_at=now() where cards.id=id;
     if not found then raise exception 'CARD_NOT_FOUND'; end if;
   else
     update public.card_forms set is_active=p_is_active,updated_at=now() where card_forms.id=id;
     if not found then raise exception 'FORM_NOT_FOUND'; end if;
   end if;
   changed:=changed+1;
 end loop;
 insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.bulk_status',jsonb_build_object('entries',p_entries,'is_active',p_is_active,'updated',changed));
 return jsonb_build_object('ok',true,'updated',changed);
end;
$acervo$;

create or replace function public.admin_delete_acervo_entry(p_scope text,p_id text,p_hard_delete boolean default false)
returns jsonb language plpgsql security definer set search_path to ''
as $acervo$
declare actor uuid:=auth.uid(); scope text:=lower(trim(coalesce(p_scope,''))); deps jsonb:='[]'::jsonb; n bigint;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if scope not in ('collection','card','form') then raise exception 'INVALID_SCOPE'; end if;
 if not p_hard_delete then
   if scope='collection' then update public.collections set is_active=false,updated_at=now() where id=p_id; if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   elsif scope='card' then update public.cards set is_active=false,updated_at=now() where id=p_id; if not found then raise exception 'CARD_NOT_FOUND'; end if;
   else update public.card_forms set is_active=false,updated_at=now() where id=p_id; if not found then raise exception 'FORM_NOT_FOUND'; end if; end if;
   insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.deactivate',jsonb_build_object('scope',scope,'id',p_id));
   return jsonb_build_object('ok',true,'mode','soft','scope',scope,'id',p_id);
 end if;
 if scope='form' then
   if not exists(select 1 from public.card_forms where id=p_id) then raise exception 'FORM_NOT_FOUND'; end if;
   delete from public.card_forms where id=p_id;
 elsif scope='card' then
   if not exists(select 1 from public.cards where id=p_id) then raise exception 'CARD_NOT_FOUND'; end if;
   select count(*) into n from public.boss_encounter_profiles where character_card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','boss_encounter_profiles','count',n); end if;
   select count(*) into n from public.card_equipment where character_card_id=p_id or item_card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','card_equipment','count',n); end if;
   select count(*) into n from public.card_forms where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','card_forms','count',n); end if;
   select count(*) into n from public.rosters where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','rosters','count',n); end if;
   select count(*) into n from public.market_listings where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','market_listings','count',n); end if;
   select count(*) into n from public.discord_spawn_cards where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','discord_spawn_cards','count',n); end if;
   select count(*) into n from public.media_assets where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','media_assets','count',n); end if;
   select count(*) into n from public.gifts where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','gifts','count',n); end if;
   select count(*) into n from public.daily_market_purchases where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','daily_market_purchases','count',n); end if;
   select count(*) into n from public.player_card_artwork where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','player_card_artwork','count',n); end if;
   select count(*) into n from public.player_card_preferences where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','player_card_preferences','count',n); end if;
   select count(*) into n from public.discord_deck_cards where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','discord_deck_cards','count',n); end if;
   if jsonb_array_length(deps)>0 then return jsonb_build_object('ok',false,'mode','blocked','scope',scope,'id',p_id,'dependencies',deps); end if;
   delete from public.cards where id=p_id;
 else
   if not exists(select 1 from public.collections where id=p_id) then raise exception 'COLLECTION_NOT_FOUND'; end if;
   select count(*) into n from public.cards where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','cards','count',n); end if;
   select count(*) into n from public.media_assets where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','media_assets','count',n); end if;
   select count(*) into n from public.gacha_banners where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','gacha_banners','count',n); end if;
   select count(*) into n from public.player_collection_preferences where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','player_collection_preferences','count',n); end if;
   if jsonb_array_length(deps)>0 then return jsonb_build_object('ok',false,'mode','blocked','scope',scope,'id',p_id,'dependencies',deps); end if;
   delete from public.collections where id=p_id;
 end if;
 insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.delete',jsonb_build_object('scope',scope,'id',p_id,'hard_delete',true));
 return jsonb_build_object('ok',true,'mode','hard','scope',scope,'id',p_id);
end;
$acervo$;

revoke execute on function public.admin_search_catalog_paginated(text,text,text,text,text,boolean,integer,integer) from public,anon;
revoke execute on function public.admin_bulk_set_acervo_status(jsonb,boolean) from public,anon;
grant execute on function public.admin_search_catalog_paginated(text,text,text,text,text,boolean,integer,integer) to authenticated;
grant execute on function public.admin_bulk_set_acervo_status(jsonb,boolean) to authenticated;
