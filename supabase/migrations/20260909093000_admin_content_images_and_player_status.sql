-- Applied to the DeckVerse Supabase project.
-- Admin-only content editing and player status support.

alter table public.profiles add column if not exists status text not null default 'active';
alter table public.collections add column if not exists synopsis text;
alter table public.cards add column if not exists synopsis text;
alter table public.card_forms add column if not exists synopsis text;

update public.profiles set status = 'active' where status is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active','suspended','banned'));
  end if;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('cards', 'cards', true, 26214400, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists deckverse_cards_admin_insert on storage.objects;
drop policy if exists deckverse_cards_admin_update on storage.objects;
drop policy if exists deckverse_cards_admin_delete on storage.objects;
drop policy if exists deckverse_cards_admin_select on storage.objects;
create policy deckverse_cards_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'cards' and app_private.is_admin());
create policy deckverse_cards_admin_update on storage.objects for update to authenticated using (bucket_id = 'cards' and app_private.is_admin()) with check (bucket_id = 'cards' and app_private.is_admin());
create policy deckverse_cards_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'cards' and app_private.is_admin());
create policy deckverse_cards_admin_select on storage.objects for select to authenticated using (bucket_id = 'cards' and app_private.is_admin());

create or replace function public.admin_update_collection_content(p_id text, p_synopsis text default null, p_is_active boolean default null, p_cover_url text default null)
returns public.collections language plpgsql security definer set search_path = '' as $$
declare old_row public.collections; new_row public.collections;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into old_row from public.collections where id = p_id for update;
  if old_row.id is null then raise exception 'COLLECTION_NOT_FOUND'; end if;
  update public.collections set synopsis = coalesce(p_synopsis, synopsis), is_active = coalesce(p_is_active, is_active), cover_url = coalesce(p_cover_url, cover_url), updated_at = now() where id = p_id returning * into new_row;
  insert into public.admin_audit_log(actor_profile_id, action, payload) values ((select auth.uid()), 'update_collection_content', jsonb_build_object('collection_id',p_id,'old_synopsis',old_row.synopsis,'new_synopsis',new_row.synopsis,'old_active',old_row.is_active,'new_active',new_row.is_active,'cover_changed',old_row.cover_url is distinct from new_row.cover_url));
  return new_row;
end; $$;
revoke all on function public.admin_update_collection_content(text,text,boolean,text) from public, anon;
grant execute on function public.admin_update_collection_content(text,text,boolean,text) to authenticated;

create or replace function public.admin_update_card_content(p_id text, p_synopsis text default null, p_is_active boolean default null, p_image_url text default null)
returns public.cards language plpgsql security definer set search_path = '' as $$
declare old_row public.cards; new_row public.cards;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into old_row from public.cards where id = p_id for update;
  if old_row.id is null then raise exception 'CARD_NOT_FOUND'; end if;
  update public.cards set synopsis = coalesce(p_synopsis, synopsis), is_active = coalesce(p_is_active, is_active), image_url = coalesce(p_image_url, image_url), updated_at = now() where id = p_id returning * into new_row;
  insert into public.admin_audit_log(actor_profile_id, action, payload) values ((select auth.uid()), 'update_card_content', jsonb_build_object('card_id',p_id,'old_synopsis',old_row.synopsis,'new_synopsis',new_row.synopsis,'old_active',old_row.is_active,'new_active',new_row.is_active,'image_changed',old_row.image_url is distinct from new_row.image_url));
  return new_row;
end; $$;
revoke all on function public.admin_update_card_content(text,text,boolean,text) from public, anon;
grant execute on function public.admin_update_card_content(text,text,boolean,text) to authenticated;

create or replace function public.admin_update_player_status(p_profile_id uuid, p_status text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare old_status text; new_row public.profiles;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'INVALID_STATUS'; end if;
  select status into old_status from public.profiles where id = p_profile_id for update;
  if old_status is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  update public.profiles set status = p_status, updated_at = now() where id = p_profile_id returning * into new_row;
  insert into public.admin_audit_log(actor_profile_id, action, target_profile_id, payload) values ((select auth.uid()), 'update_player_status', p_profile_id, jsonb_build_object('old_status',old_status,'new_status',p_status));
  return new_row;
end; $$;
revoke all on function public.admin_update_player_status(uuid,text) from public, anon;
grant execute on function public.admin_update_player_status(uuid,text) to authenticated;

create or replace function public.admin_update_form_content(p_id text, p_synopsis text default null, p_is_active boolean default null, p_image_url text default null)
returns public.card_forms language plpgsql security definer set search_path = '' as $$
declare old_row public.card_forms; new_row public.card_forms;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into old_row from public.card_forms where id = p_id for update;
  if old_row.id is null then raise exception 'FORM_NOT_FOUND'; end if;
  update public.card_forms set synopsis = coalesce(p_synopsis, synopsis), is_active = coalesce(p_is_active, is_active), image_url = coalesce(p_image_url, image_url), updated_at = now() where id = p_id returning * into new_row;
  insert into public.admin_audit_log(actor_profile_id, action, payload) values ((select auth.uid()), 'update_form_content', jsonb_build_object('form_id',p_id,'image_changed',old_row.image_url is distinct from new_row.image_url));
  return new_row;
end; $$;
revoke all on function public.admin_update_form_content(text,text,boolean,text) from public, anon;
grant execute on function public.admin_update_form_content(text,text,boolean,text) to authenticated;

create or replace function public.admin_search_players(p_query text default '')
returns table(id uuid, discord_id text, discord_username text, display_name text, avatar_url text, role text, status text, level integer, pwr bigint, astral_shards bigint, ether_cores bigint)
language sql security definer set search_path = '' as $$
select p.id,p.discord_id,p.discord_username,p.display_name,p.avatar_url,p.role,p.status,p.level,p.pwr,p.astral_shards,p.ether_cores from public.profiles p where app_private.is_admin() and (coalesce(trim(p_query),'')='' or lower(coalesce(p.display_name,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.discord_username,'')) like '%'||lower(trim(p_query))||'%' or coalesce(p.discord_id,'') like '%'||trim(p_query)||'%') order by lower(coalesce(p.display_name,p.discord_username,'')) limit 100;
$$;
revoke all on function public.admin_search_players(text) from public, anon;
grant execute on function public.admin_search_players(text) to authenticated;

-- media_assets is already present in the canonical schema; keep its admin-only policy contract explicit.
drop policy if exists media_assets_admin_read on public.media_assets;
drop policy if exists media_assets_admin_insert on public.media_assets;
drop policy if exists media_assets_admin_update on public.media_assets;
drop policy if exists media_assets_admin_delete on public.media_assets;
create policy media_assets_admin_read on public.media_assets for select to authenticated using (app_private.is_admin());
create policy media_assets_admin_insert on public.media_assets for insert to authenticated with check (app_private.is_admin());
create policy media_assets_admin_update on public.media_assets for update to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy media_assets_admin_delete on public.media_assets for delete to authenticated using (app_private.is_admin());
