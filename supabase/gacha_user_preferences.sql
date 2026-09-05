-- DeckVerse OS — preferências pessoais de Gacha (Disablelist + Wishlist)
-- A Disablelist altera somente o pool do próprio usuário.
-- Wishes são marcações/realces e não alteram secretamente as taxas.

create table if not exists public.gacha_collection_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  collection_id text not null references public.collections(id) on delete cascade,
  is_disabled boolean not null default false,
  is_wished boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, collection_id)
);

create index if not exists gacha_collection_preferences_profile_disabled_idx
  on public.gacha_collection_preferences(profile_id, is_disabled)
  where is_disabled;

create index if not exists gacha_collection_preferences_profile_wished_idx
  on public.gacha_collection_preferences(profile_id, is_wished)
  where is_wished;

create table if not exists public.gacha_card_wishes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, card_id)
);

create index if not exists gacha_card_wishes_profile_idx
  on public.gacha_card_wishes(profile_id, created_at desc);

alter table public.gacha_collection_preferences enable row level security;
alter table public.gacha_card_wishes enable row level security;

revoke all on public.gacha_collection_preferences from anon;
revoke all on public.gacha_card_wishes from anon;
grant select, insert, update, delete on public.gacha_collection_preferences to authenticated;
grant select, insert, update, delete on public.gacha_card_wishes to authenticated;

drop policy if exists gacha_collection_preferences_self_or_admin_select on public.gacha_collection_preferences;
create policy gacha_collection_preferences_self_or_admin_select
on public.gacha_collection_preferences for select to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists gacha_collection_preferences_self_insert on public.gacha_collection_preferences;
create policy gacha_collection_preferences_self_insert
on public.gacha_collection_preferences for insert to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists gacha_collection_preferences_self_update on public.gacha_collection_preferences;
create policy gacha_collection_preferences_self_update
on public.gacha_collection_preferences for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists gacha_collection_preferences_self_delete on public.gacha_collection_preferences;
create policy gacha_collection_preferences_self_delete
on public.gacha_collection_preferences for delete to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists gacha_card_wishes_self_or_admin_select on public.gacha_card_wishes;
create policy gacha_card_wishes_self_or_admin_select
on public.gacha_card_wishes for select to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists gacha_card_wishes_self_insert on public.gacha_card_wishes;
create policy gacha_card_wishes_self_insert
on public.gacha_card_wishes for insert to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists gacha_card_wishes_self_delete on public.gacha_card_wishes;
create policy gacha_card_wishes_self_delete
on public.gacha_card_wishes for delete to authenticated
using (profile_id = (select auth.uid()));

create or replace function public.get_my_gacha_preferences()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  return jsonb_build_object(
    'disabled_collections', coalesce((
      select jsonb_agg(p.collection_id order by p.collection_id)
      from public.gacha_collection_preferences p
      where p.profile_id = uid and p.is_disabled
    ), '[]'::jsonb),
    'wished_collections', coalesce((
      select jsonb_agg(p.collection_id order by p.collection_id)
      from public.gacha_collection_preferences p
      where p.profile_id = uid and p.is_wished
    ), '[]'::jsonb),
    'wished_cards', coalesce((
      select jsonb_agg(w.card_id order by w.created_at desc)
      from public.gacha_card_wishes w
      where w.profile_id = uid
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_collection_gacha_preference(
  p_collection_id text,
  p_disabled boolean default false,
  p_wished boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.collections c where c.id = p_collection_id and c.is_active) then
    raise exception 'COLLECTION_NOT_AVAILABLE';
  end if;

  insert into public.gacha_collection_preferences(profile_id, collection_id, is_disabled, is_wished, updated_at)
  values(uid, p_collection_id, coalesce(p_disabled, false), coalesce(p_wished, false), now())
  on conflict(profile_id, collection_id) do update
    set is_disabled = excluded.is_disabled,
        is_wished = excluded.is_wished,
        updated_at = now();

  if coalesce(p_disabled, false) and not exists (
    select 1
    from public.cards c
    join public.collections col on col.id = c.collection_id and col.is_active
    where c.is_active and c.is_gacha_enabled
      and not exists (
        select 1
        from public.gacha_collection_preferences p
        where p.profile_id = uid
          and p.collection_id = c.collection_id
          and p.is_disabled
      )
  ) then
    raise exception 'DISABLELIST_WOULD_EMPTY_POOL';
  end if;

  delete from public.gacha_collection_preferences p
  where p.profile_id = uid and p.collection_id = p_collection_id
    and not p.is_disabled and not p.is_wished;

  return public.get_my_gacha_preferences();
end;
$$;

create or replace function public.set_card_wish(p_card_id text, p_wished boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.cards c
    join public.collections col on col.id = c.collection_id
    where c.id = p_card_id and c.is_active and col.is_active
  ) then raise exception 'CARD_NOT_AVAILABLE'; end if;

  if coalesce(p_wished, true) then
    insert into public.gacha_card_wishes(profile_id, card_id)
    values(uid, p_card_id)
    on conflict(profile_id, card_id) do nothing;
  else
    delete from public.gacha_card_wishes where profile_id = uid and card_id = p_card_id;
  end if;

  return public.get_my_gacha_preferences();
end;
$$;

create or replace function public.clear_gacha_disablelist()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.gacha_collection_preferences
  set is_disabled = false, updated_at = now()
  where profile_id = uid and is_disabled;
  delete from public.gacha_collection_preferences
  where profile_id = uid and not is_disabled and not is_wished;
  return public.get_my_gacha_preferences();
end;
$$;

revoke all on function public.get_my_gacha_preferences() from public;
revoke all on function public.set_collection_gacha_preference(text, boolean, boolean) from public;
revoke all on function public.set_card_wish(text, boolean) from public;
revoke all on function public.clear_gacha_disablelist() from public;
grant execute on function public.get_my_gacha_preferences() to authenticated;
grant execute on function public.set_collection_gacha_preference(text, boolean, boolean) to authenticated;
grant execute on function public.set_card_wish(text, boolean) to authenticated;
grant execute on function public.clear_gacha_disablelist() to authenticated;

-- O pool do Gacha passa a respeitar a Disablelist pessoal.
create or replace function app_private.roll_gacha_for(p_uid uuid, p_count integer default 1, p_currency text default 'astral_shards'::text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
 prof public.profiles%rowtype; cfg jsonb; rates jsonb; pity_cfg jsonb; batch_cfg jsonb;
 max_batch integer; unit_cost integer; total_cost bigint; i integer;
 pity integer; pity_before integer; start_after integer; hard_pity integer;
 step_percent numeric; boost numeric; roll_value numeric;
 r_r numeric; r_sr numeric; r_ssr numeric; r_ur numeric; r_lr numeric; r_mr numeric;
 selected_rarity text; selected_card public.cards%rowtype;
 pulls jsonb:='[]'::jsonb; new_balance bigint;
 card_wished boolean; collection_wished boolean;
begin
 if p_uid is null then raise exception 'PROFILE_REQUIRED'; end if;
 if p_currency not in ('astral_shards','ether_cores') then raise exception 'INVALID_CURRENCY'; end if;
 select * into prof from public.profiles where id=p_uid for update;
 if prof.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
 select value into cfg from public.game_settings where key='gacha_config';
 if cfg is null then raise exception 'GACHA_CONFIG_MISSING'; end if;
 rates:=cfg->'base_drop_rates'; pity_cfg:=cfg->'pity'; batch_cfg:=cfg->'batch';
 max_batch:=least(coalesce((batch_cfg->>'hard_max')::int,50),coalesce((batch_cfg->>'base_max')::int,10)+floor(prof.level/10.0)::int*coalesce((batch_cfg->>'per_10_levels')::int,5));
 if p_count<1 or p_count>max_batch then raise exception 'ROLL_COUNT_EXCEEDS_LEVEL_LIMIT'; end if;
 unit_cost:=case when p_currency='astral_shards' then coalesce((cfg->>'cost_astral')::int,100) else coalesce((cfg->>'cost_ether')::int,10) end;
 total_cost:=unit_cost*p_count;
 if (p_currency='astral_shards' and prof.astral_shards<total_cost) or (p_currency='ether_cores' and prof.ether_cores<total_cost) then raise exception 'INSUFFICIENT_BALANCE'; end if;

 if not exists (
   select 1 from public.cards c
   join public.collections col on col.id=c.collection_id and col.is_active
   where c.is_active and c.is_gacha_enabled
     and not exists (
       select 1 from public.gacha_collection_preferences pref
       where pref.profile_id=p_uid and pref.collection_id=c.collection_id and pref.is_disabled
     )
 ) then raise exception 'NO_GACHA_CARDS_AVAILABLE_FOR_FILTER'; end if;

 if p_currency='astral_shards' then update public.profiles set astral_shards=astral_shards-total_cost where id=p_uid returning astral_shards::bigint into new_balance;
 else update public.profiles set ether_cores=ether_cores-total_cost where id=p_uid returning ether_cores::bigint into new_balance; end if;
 insert into public.economy_ledger(profile_id,currency,delta,balance_after,reason,source) values(p_uid,p_currency,-total_cost,new_balance,'Gacha','gacha');
 pity:=prof.pity_counter; pity_before:=pity;
 start_after:=coalesce((pity_cfg->>'start_after')::int,10); hard_pity:=coalesce((pity_cfg->>'hard_pity')::int,80); step_percent:=coalesce((pity_cfg->>'step_percent')::numeric,.35);

 for i in 1..p_count loop
   selected_card := null;
   r_sr:=coalesce((rates->>'SR')::numeric,25); r_ssr:=coalesce((rates->>'SSR')::numeric,12); r_ur:=coalesce((rates->>'UR')::numeric,6); r_lr:=coalesce((rates->>'LR')::numeric,1.7); r_mr:=coalesce((rates->>'MR')::numeric,.3);
   boost:=least(25,greatest(0,pity-start_after)*step_percent); r_ur:=r_ur+boost*.80; r_lr:=r_lr+boost*.15; r_mr:=r_mr+boost*.05; r_r:=greatest(0,100-r_sr-r_ssr-r_ur-r_lr-r_mr);
   if pity+1>=hard_pity then roll_value:=random()*100; selected_rarity:=case when roll_value<5 then 'MR' when roll_value<25 then 'LR' else 'UR' end;
   else roll_value:=random()*100; selected_rarity:=case when roll_value<r_mr then 'MR' when roll_value<r_mr+r_lr then 'LR' when roll_value<r_mr+r_lr+r_ur then 'UR' when roll_value<r_mr+r_lr+r_ur+r_ssr then 'SSR' when roll_value<r_mr+r_lr+r_ur+r_ssr+r_sr then 'SR' else 'R' end; end if;

   select c.* into selected_card
   from public.cards c
   join public.collections col on col.id=c.collection_id and col.is_active
   where c.is_active and c.is_gacha_enabled and c.rarity=selected_rarity
     and not exists (
       select 1 from public.gacha_collection_preferences pref
       where pref.profile_id=p_uid and pref.collection_id=c.collection_id and pref.is_disabled
     )
   order by random() limit 1;

   if selected_card.id is null then
     select c.* into selected_card
     from public.cards c
     join public.collections col on col.id=c.collection_id and col.is_active
     where c.is_active and c.is_gacha_enabled
       and not exists (
         select 1 from public.gacha_collection_preferences pref
         where pref.profile_id=p_uid and pref.collection_id=c.collection_id and pref.is_disabled
       )
     order by random() limit 1;
   end if;
   if selected_card.id is null then raise exception 'NO_GACHA_CARDS_AVAILABLE_FOR_FILTER'; end if;

   select exists(select 1 from public.gacha_card_wishes w where w.profile_id=p_uid and w.card_id=selected_card.id) into card_wished;
   select exists(select 1 from public.gacha_collection_preferences p where p.profile_id=p_uid and p.collection_id=selected_card.collection_id and p.is_wished) into collection_wished;

   insert into public.rosters(profile_id,card_id,copies) values(p_uid,selected_card.id,1)
   on conflict(profile_id,card_id) do update set copies=public.rosters.copies+1,updated_at=now();
   pulls:=pulls||jsonb_build_array(jsonb_build_object(
     'card_id',selected_card.id,
     'name',selected_card.name,
     'rarity',selected_card.rarity,
     'entity_type',selected_card.entity_type,
     'collection_id',selected_card.collection_id,
     'image_url',selected_card.image_url,
     'is_wished',card_wished,
     'collection_wished',collection_wished
   ));
   if selected_card.rarity in('UR','LR','MR') then pity:=0; else pity:=pity+1; end if;
 end loop;

 update public.profiles set pity_counter=pity,cosmic_luck=1+(pity*.01),updated_at=now() where id=p_uid;
 insert into public.gacha_rolls(profile_id,roll_count,currency,total_cost,pity_before,pity_after,pulls) values(p_uid,p_count,p_currency,total_cost,pity_before,pity,pulls);
 return jsonb_build_object('pulls',pulls,'pity_before',pity_before,'pity_after',pity,'currency',p_currency,'cost',total_cost,'balance_after',new_balance,'max_batch',max_batch);
end;
$$;
