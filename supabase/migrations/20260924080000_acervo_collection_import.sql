-- Idempotent collection/card import entry point for the Acervo.
-- Accepts a collection manifest plus card rows, allowing future collections
-- to be created without changing application code.
create or replace function public.admin_import_acervo_collection(
  p_collection jsonb,
  p_entries jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path to ''
as $acervo$
declare
  actor uuid:=auth.uid(); v_collection_id text:=upper(trim(coalesce(p_collection->>'id','')));
  v_collection_name text:=trim(coalesce(p_collection->>'name','')); entry jsonb;
  v_entry_id text; v_entry_slug text; v_entry_name text; v_entry_type text; v_rarity text; v_role text; v_synopsis text; v_description text; v_image_url text; existing_id text;
  created_count integer:=0; updated_count integer:=0; skipped_count integer:=0; result_rows jsonb:='[]'::jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if v_collection_id !~ '^COL-[0-9]{2}-[A-Z0-9][A-Z0-9_-]*$' then raise exception 'INVALID_COLLECTION_ID'; end if;
  if v_collection_name='' then raise exception 'COLLECTION_NAME_REQUIRED'; end if;
  if jsonb_typeof(p_entries)<>'array' then raise exception 'ENTRIES_MUST_BE_ARRAY'; end if;

  insert into public.collections(id,name,slug,synopsis,description,is_active,updated_at)
  values(v_collection_id,v_collection_name,nullif(trim(coalesce(p_collection->>'slug','')),''),
    nullif(trim(coalesce(p_collection->>'synopsis','')),''),nullif(trim(coalesce(p_collection->>'description','')),''),
    coalesce((p_collection->>'is_active')::boolean,true),now())
  on conflict(id) do update set name=excluded.name,slug=coalesce(excluded.slug,public.collections.slug),
    synopsis=coalesce(excluded.synopsis,public.collections.synopsis),description=coalesce(excluded.description,public.collections.description),
    is_active=excluded.is_active,updated_at=now();

  for entry in select * from jsonb_array_elements(p_entries) loop
    v_entry_name:=trim(coalesce(entry->>'name',''));
    v_entry_type:=lower(trim(coalesce(entry->>'entity_type',entry->>'entityType','character')));
    v_rarity:=nullif(trim(coalesce(entry->>'rarity','')),''); v_role:=nullif(trim(coalesce(entry->>'role','')),'');
    v_synopsis:=nullif(trim(coalesce(entry->>'synopsis','')),''); v_description:=nullif(trim(coalesce(entry->>'description','')),'');
    v_image_url:=nullif(trim(coalesce(entry->>'image_url',entry->>'imageUrl','')),'');
    v_entry_slug:=lower(trim(coalesce(entry->>'slug',''))); v_entry_id:=nullif(trim(coalesce(entry->>'id','')),'');
    if v_entry_name='' then skipped_count:=skipped_count+1; continue; end if;
    if v_entry_type not in('character','item','boss') then raise exception 'INVALID_ENTITY_TYPE:%',v_entry_type; end if;
    if v_entry_slug='' then
      v_entry_slug:=lower(regexp_replace(translate(v_entry_name,'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ','aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),'[^a-zA-Z0-9]+','_','g'));
      v_entry_slug:=trim(both '_' from v_entry_slug);
    end if;
    if v_entry_id is null then v_entry_id:=v_collection_id||':'||v_entry_type||':'||v_entry_slug; end if;

    select c.id into existing_id from public.cards c
    where c.id=v_entry_id or (c.collection_id=v_collection_id and c.entity_type=v_entry_type and c.slug=v_entry_slug) limit 1;

    if existing_id is null then
      insert into public.cards(id,collection_id,name,entity_type,rarity,role,synopsis,description,image_url,is_active,is_gacha_enabled,slug,updated_at)
      values(v_entry_id,v_collection_id,v_entry_name,v_entry_type,coalesce(v_rarity,'Comum'),coalesce(v_role,'DPS'),v_synopsis,v_description,v_image_url,
        coalesce((entry->>'is_active')::boolean,true),coalesce((entry->>'is_gacha_enabled')::boolean,true),v_entry_slug,now());
      created_count:=created_count+1;
    else
      update public.cards c set name=v_entry_name,collection_id=v_collection_id,entity_type=v_entry_type,rarity=coalesce(v_rarity,c.rarity),
        role=coalesce(v_role,c.role),synopsis=coalesce(v_synopsis,c.synopsis),description=coalesce(v_description,c.description),
        image_url=coalesce(v_image_url,c.image_url),is_active=coalesce((entry->>'is_active')::boolean,c.is_active),
        is_gacha_enabled=coalesce((entry->>'is_gacha_enabled')::boolean,c.is_gacha_enabled),slug=v_entry_slug,updated_at=now()
      where c.id=existing_id;
      v_entry_id:=existing_id; updated_count:=updated_count+1;
    end if;
    result_rows:=result_rows||jsonb_build_array(jsonb_build_object('id',v_entry_id,'collection_id',v_collection_id,'name',v_entry_name,'entity_type',v_entry_type,'slug',v_entry_slug,'status','ok'));
  end loop;

  insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.import',jsonb_build_object('collection_id',v_collection_id,'collection_name',v_collection_name,'created',created_count,'updated',updated_count,'skipped',skipped_count));
  return jsonb_build_object('ok',true,'collection_id',v_collection_id,'created',created_count,'updated',updated_count,'skipped',skipped_count,'rows',result_rows);
end;
$acervo$;

revoke execute on function public.admin_import_acervo_collection(jsonb,jsonb) from public,anon;
grant execute on function public.admin_import_acervo_collection(jsonb,jsonb) to authenticated;