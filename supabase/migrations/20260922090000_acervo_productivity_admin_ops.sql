-- Acervo productivity admin operations.
create index if not exists idx_acervo_cards_collection_id on public.cards(collection_id);
create index if not exists idx_acervo_media_assets_collection_id on public.media_assets(collection_id);
create index if not exists idx_acervo_rosters_card_id on public.rosters(card_id);
create index if not exists idx_acervo_market_listings_card_status on public.market_listings(card_id,status);
create index if not exists idx_acervo_discord_spawn_cards_card_id on public.discord_spawn_cards(card_id);

create or replace function public.admin_update_acervo_entry(p_scope text,p_id text,p_name text default null,p_rarity text default null,p_entity_type text default null,p_collection_id text default null,p_synopsis text default null,p_description text default null,p_image_url text default null,p_is_active boolean default null,p_clear_image boolean default false)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare actor uuid := (select auth.uid()); scope text:=lower(trim(coalesce(p_scope,''))); n text:=nullif(trim(coalesce(p_name,'')),''); r text:=nullif(trim(coalesce(p_rarity,'')),''); et text:=nullif(lower(trim(coalesce(p_entity_type,''))),''); cid text:=nullif(trim(coalesce(p_collection_id,'')),''); syn text:=nullif(trim(coalesce(p_synopsis,'')),''); descr text:=nullif(trim(coalesce(p_description,'')),''); img text:=nullif(trim(coalesce(p_image_url,'')),'');
begin
if actor is null then raise exception 'AUTH_REQUIRED'; end if;
if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
if scope not in ('collection','card','form') then raise exception 'INVALID_SCOPE'; end if;
if n is null then raise exception 'NAME_REQUIRED'; end if;
if scope='collection' then
 if char_length(n)>200 then raise exception 'NAME_TOO_LONG'; end if;
 if p_synopsis is not null and char_length(syn)>400 then raise exception 'SYNOPSIS_TOO_LONG'; end if;
 update public.collections set name=n,synopsis=case when p_synopsis is not null then syn else synopsis end,description=case when p_description is not null then descr else description end,cover_url=case when p_clear_image then null when p_image_url is not null then img else cover_url end,is_active=coalesce(p_is_active,is_active),updated_at=now() where id=p_id;
 if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
elsif scope='card' then
 if char_length(n)>300 then raise exception 'NAME_TOO_LONG'; end if;
 if et is not null and et not in ('character','item','boss') then raise exception 'INVALID_ENTITY_TYPE'; end if;
 if p_synopsis is not null and char_length(syn)>500 then raise exception 'SYNOPSIS_TOO_LONG'; end if;
 if cid is not null and not exists(select 1 from public.collections where id=cid) then raise exception 'COLLECTION_NOT_FOUND'; end if;
 update public.cards set name=n,rarity=case when p_rarity is not null then r else rarity end,entity_type=coalesce(et,entity_type),collection_id=case when p_collection_id is not null then cid else collection_id end,synopsis=case when p_synopsis is not null then syn else synopsis end,description=case when p_description is not null then descr else description end,image_url=case when p_clear_image then null when p_image_url is not null then img else image_url end,is_active=coalesce(p_is_active,is_active),updated_at=now() where id=p_id;
 if not found then raise exception 'CARD_NOT_FOUND'; end if;
else
 if char_length(n)>300 then raise exception 'NAME_TOO_LONG'; end if;
 if p_synopsis is not null and char_length(syn)>220 then raise exception 'SYNOPSIS_TOO_LONG'; end if;
 update public.card_forms set name=n,rarity=case when p_rarity is not null then r else rarity end,synopsis=case when p_synopsis is not null then syn else synopsis end,description=case when p_description is not null then descr else description end,image_url=case when p_clear_image then null when p_image_url is not null then img else image_url end,is_active=coalesce(p_is_active,is_active),updated_at=now() where id=p_id;
 if not found then raise exception 'FORM_NOT_FOUND'; end if;
end if;
insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.update',jsonb_build_object('scope',scope,'id',p_id,'name',n,'entity_type',et,'collection_id',cid,'active',p_is_active));
return jsonb_build_object('ok',true,'scope',scope,'id',p_id,'name',n,'entity_type',coalesce(et,''));
end; $$;

create or replace function public.admin_delete_acervo_entry(p_scope text,p_id text,p_hard_delete boolean default false)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare actor uuid:=(select auth.uid()); scope text:=lower(trim(coalesce(p_scope,''))); deps jsonb:='[]'::jsonb; n bigint;
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
 select count(*) into n from public.rosters where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','rosters','count',n); end if;
 select count(*) into n from public.market_listings where card_id=p_id and status='active'; if n>0 then deps:=deps||jsonb_build_object('table','market_listings(active)','count',n); end if;
 select count(*) into n from public.discord_spawn_cards where card_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','discord_spawn_cards','count',n); end if;
 if jsonb_array_length(deps)>0 then return jsonb_build_object('ok',false,'mode','blocked','scope',scope,'id',p_id,'dependencies',deps); end if;
 delete from public.cards where id=p_id;
else
 if not exists(select 1 from public.collections where id=p_id) then raise exception 'COLLECTION_NOT_FOUND'; end if;
 select count(*) into n from public.cards where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','cards','count',n); end if;
 select count(*) into n from public.media_assets where collection_id=p_id; if n>0 then deps:=deps||jsonb_build_object('table','media_assets','count',n); end if;
 if jsonb_array_length(deps)>0 then return jsonb_build_object('ok',false,'mode','blocked','scope',scope,'id',p_id,'dependencies',deps); end if;
 delete from public.collections where id=p_id;
end if;
insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.delete',jsonb_build_object('scope',scope,'id',p_id,'hard_delete',true));
return jsonb_build_object('ok',true,'mode','hard','scope',scope,'id',p_id);
end; $$;

revoke execute on function public.admin_update_acervo_entry(text,text,text,text,text,text,text,text,text,boolean,boolean) from public,anon;
revoke execute on function public.admin_delete_acervo_entry(text,text,boolean) from public,anon;
grant execute on function public.admin_update_acervo_entry(text,text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.admin_delete_acervo_entry(text,text,boolean) to authenticated;
