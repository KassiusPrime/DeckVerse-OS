-- Reproducible definition for the Acervo card creation RPC.
create or replace function public.admin_create_acervo_card(
  p_collection_id text,
  p_name text,
  p_entity_type text default 'character',
  p_rarity text default 'Comum',
  p_role text default 'DPS',
  p_synopsis text default null,
  p_description text default null,
  p_image_url text default null,
  p_is_active boolean default true,
  p_is_gacha_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $acervo$
declare
  actor uuid := auth.uid();
  new_id text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'NAME_REQUIRED'; end if;
  if p_entity_type not in ('character','item','boss') then raise exception 'INVALID_ENTITY_TYPE'; end if;
  if not exists(select 1 from public.collections where id=p_collection_id) then raise exception 'COLLECTION_NOT_FOUND'; end if;
  if p_synopsis is not null and char_length(p_synopsis)>500 then raise exception 'SYNOPSIS_TOO_LONG'; end if;
  new_id := lower(regexp_replace(coalesce(p_collection_id,'collection'),'[^a-zA-Z0-9]+','_','g'))
    || ':' || lower(p_entity_type) || ':'
    || lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','_','g'))
    || ':' || substr(md5(random()::text || clock_timestamp()::text),1,8);
  insert into public.cards(id,collection_id,name,entity_type,rarity,role,synopsis,description,image_url,is_active,is_gacha_enabled)
  values(new_id,p_collection_id,trim(p_name),p_entity_type,coalesce(nullif(trim(p_rarity),''),'Comum'),coalesce(nullif(trim(p_role),''),'DPS'),p_synopsis,p_description,p_image_url,coalesce(p_is_active,true),coalesce(p_is_gacha_enabled,true));
  insert into public.admin_audit_log(actor_profile_id,action,payload)
  values(actor,'acervo.create',jsonb_build_object('scope','card','id',new_id,'collection_id',p_collection_id,'name',trim(p_name),'entity_type',p_entity_type));
  return jsonb_build_object('ok',true,'scope','card','id',new_id,'name',trim(p_name),'entity_type',p_entity_type,'collection_id',p_collection_id);
end;
$acervo$;

revoke execute on function public.admin_create_acervo_card(text,text,text,text,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.admin_create_acervo_card(text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;