-- DeckVerse Discord bot extension. Apply after supabase/bootstrap.sql.
-- The core roll function accepts a target UUID but is private and cannot be
-- executed by browser roles. Public wrappers enforce either auth.uid() or the
-- server-only service_role.

create or replace function app_private.roll_gacha_for(p_uid uuid, p_count integer default 1, p_currency text default 'astral_shards')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles%rowtype;
  cfg jsonb; rates jsonb; pity_cfg jsonb; batch_cfg jsonb;
  max_batch integer; unit_cost integer; total_cost bigint; i integer;
  pity integer; pity_before integer; start_after integer; hard_pity integer;
  step_percent numeric; boost numeric; roll_value numeric;
  r_r numeric; r_sr numeric; r_ssr numeric; r_ur numeric; r_lr numeric; r_mr numeric;
  selected_rarity text; selected_card public.cards%rowtype;
  pulls jsonb := '[]'::jsonb; new_balance bigint;
begin
  if p_uid is null then raise exception 'PROFILE_REQUIRED'; end if;
  if p_currency not in ('astral_shards','ether_cores') then raise exception 'INVALID_CURRENCY'; end if;
  select * into prof from public.profiles where id=p_uid for update;
  if prof.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  select value into cfg from public.game_settings where key='gacha_config';
  if cfg is null then raise exception 'GACHA_CONFIG_MISSING'; end if;

  rates := cfg->'base_drop_rates'; pity_cfg := cfg->'pity'; batch_cfg := cfg->'batch';
  max_batch := least(coalesce((batch_cfg->>'hard_max')::int,50), coalesce((batch_cfg->>'base_max')::int,10) + floor(prof.level/10.0)::int * coalesce((batch_cfg->>'per_10_levels')::int,5));
  if p_count < 1 or p_count > max_batch then raise exception 'ROLL_COUNT_EXCEEDS_LEVEL_LIMIT'; end if;
  unit_cost := case when p_currency='astral_shards' then coalesce((cfg->>'cost_astral')::int,100) else coalesce((cfg->>'cost_ether')::int,10) end;
  total_cost := unit_cost * p_count;
  if (p_currency='astral_shards' and prof.astral_shards < total_cost) or (p_currency='ether_cores' and prof.ether_cores < total_cost) then raise exception 'INSUFFICIENT_BALANCE'; end if;

  if p_currency='astral_shards' then update public.profiles set astral_shards=astral_shards-total_cost where id=p_uid returning astral_shards into new_balance;
  else update public.profiles set ether_cores=ether_cores-total_cost where id=p_uid returning ether_cores into new_balance; end if;
  insert into public.economy_ledger(profile_id,currency,delta,balance_after,reason,source) values(p_uid,p_currency,-total_cost,new_balance,'Gacha','gacha');

  pity := prof.pity_counter; pity_before := pity;
  start_after := coalesce((pity_cfg->>'start_after')::int,10);
  hard_pity := coalesce((pity_cfg->>'hard_pity')::int,80);
  step_percent := coalesce((pity_cfg->>'step_percent')::numeric,.35);

  for i in 1..p_count loop
    r_sr := coalesce((rates->>'SR')::numeric,25); r_ssr := coalesce((rates->>'SSR')::numeric,12);
    r_ur := coalesce((rates->>'UR')::numeric,6); r_lr := coalesce((rates->>'LR')::numeric,1.7); r_mr := coalesce((rates->>'MR')::numeric,.3);
    boost := least(25, greatest(0,pity-start_after) * step_percent);
    r_ur := r_ur + boost*.80; r_lr := r_lr + boost*.15; r_mr := r_mr + boost*.05;
    r_r := greatest(0,100-r_sr-r_ssr-r_ur-r_lr-r_mr);

    if pity + 1 >= hard_pity then
      roll_value := random()*100;
      selected_rarity := case when roll_value < 5 then 'MR' when roll_value < 25 then 'LR' else 'UR' end;
    else
      roll_value := random()*100;
      selected_rarity := case
        when roll_value < r_mr then 'MR'
        when roll_value < r_mr+r_lr then 'LR'
        when roll_value < r_mr+r_lr+r_ur then 'UR'
        when roll_value < r_mr+r_lr+r_ur+r_ssr then 'SSR'
        when roll_value < r_mr+r_lr+r_ur+r_ssr+r_sr then 'SR'
        else 'R' end;
    end if;

    select * into selected_card from public.cards
      where is_active and is_gacha_enabled and rarity=selected_rarity
        and collection_id in (select id from public.collections where is_active)
      order by random() limit 1;
    if selected_card.id is null then
      select * into selected_card from public.cards where is_active and is_gacha_enabled and collection_id in (select id from public.collections where is_active) order by random() limit 1;
    end if;
    if selected_card.id is null then raise exception 'NO_GACHA_CARDS_AVAILABLE'; end if;

    insert into public.rosters(profile_id,card_id,copies) values(p_uid,selected_card.id,1)
      on conflict(profile_id,card_id) do update set copies=public.rosters.copies+1,updated_at=now();
    pulls := pulls || jsonb_build_array(jsonb_build_object('card_id',selected_card.id,'name',selected_card.name,'rarity',selected_card.rarity,'entity_type',selected_card.entity_type,'image_url',selected_card.image_url));
    if selected_card.rarity in ('UR','LR','MR') then pity := 0; else pity := pity+1; end if;
  end loop;

  update public.profiles set pity_counter=pity,cosmic_luck=1+(pity*.01),updated_at=now() where id=p_uid;
  insert into public.gacha_rolls(profile_id,roll_count,currency,total_cost,pity_before,pity_after,pulls) values(p_uid,p_count,p_currency,total_cost,pity_before,pity,pulls);
  return jsonb_build_object('pulls',pulls,'pity_before',pity_before,'pity_after',pity,'currency',p_currency,'cost',total_cost,'balance_after',new_balance,'max_batch',max_batch);
end;
$$;
revoke all on function app_private.roll_gacha_for(uuid,integer,text) from public, anon, authenticated;

-- Replace the bootstrap browser wrapper with a thin authenticated wrapper.
drop function if exists public.roll_gacha(integer,text);
create function public.roll_gacha(p_count integer default 1, p_currency text default 'astral_shards')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  return app_private.roll_gacha_for(uid,p_count,p_currency);
end;
$$;
revoke all on function public.roll_gacha(integer,text) from public, anon;
grant execute on function public.roll_gacha(integer,text) to authenticated;

create or replace function public.bot_roll_gacha(p_discord_id text, p_count integer default 1, p_currency text default 'astral_shards')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid; jwt_role text := coalesce((select auth.jwt()->>'role'),'');
begin
  if current_user <> 'service_role' and jwt_role <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select id into uid from public.profiles where discord_id=p_discord_id;
  if uid is null then raise exception 'DISCORD_PROFILE_NOT_FOUND'; end if;
  return app_private.roll_gacha_for(uid,p_count,p_currency);
end;
$$;
revoke all on function public.bot_roll_gacha(text,integer,text) from public, anon, authenticated;
grant execute on function public.bot_roll_gacha(text,integer,text) to service_role;
