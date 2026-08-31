-- DeckVerse v11 — Supabase bootstrap (idempotent / non-destructive)
-- Staging SQL. Apply to the dedicated DeckVerse project, then record it as an
-- official Supabase migration after the project is selected and verified.

create extension if not exists pgcrypto;
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table if not exists public.collections (
  id text primary key,
  name text not null,
  description text,
  category text,
  publisher text,
  cover_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections add column if not exists category text;
alter table public.collections add column if not exists publisher text;
alter table public.collections add column if not exists cover_url text;
alter table public.collections add column if not exists is_active boolean not null default true;
alter table public.collections add column if not exists updated_at timestamptz not null default now();

create table if not exists public.cards (
  id text primary key,
  collection_id text references public.collections(id) on update cascade on delete restrict,
  name text not null,
  entity_type text not null default 'character',
  rarity text not null default 'R',
  role text,
  atk integer not null default 0,
  def integer not null default 0,
  mag integer not null default 0,
  speed integer not null default 0,
  hp integer not null default 0,
  image_url text,
  description text,
  is_active boolean not null default true,
  is_gacha_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards add column if not exists entity_type text not null default 'character';
alter table public.cards add column if not exists rarity text not null default 'R';
alter table public.cards add column if not exists role text;
alter table public.cards add column if not exists atk integer not null default 0;
alter table public.cards add column if not exists def integer not null default 0;
alter table public.cards add column if not exists mag integer not null default 0;
alter table public.cards add column if not exists speed integer not null default 0;
alter table public.cards add column if not exists hp integer not null default 0;
alter table public.cards add column if not exists image_url text;
alter table public.cards add column if not exists description text;
alter table public.cards add column if not exists is_active boolean not null default true;
alter table public.cards add column if not exists is_gacha_enabled boolean not null default true;
alter table public.cards add column if not exists updated_at timestamptz not null default now();

create table if not exists public.card_forms (
  id text primary key,
  card_id text not null references public.cards(id) on update cascade on delete cascade,
  name text not null,
  rarity text,
  image_url text,
  description text,
  order_index integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_forms_card_name_uidx on public.card_forms(card_id, lower(name));
create index if not exists cards_collection_idx on public.cards(collection_id);
create index if not exists cards_rarity_idx on public.cards(rarity) where is_active and is_gacha_enabled;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  discord_username text,
  display_name text,
  avatar_url text,
  role text not null default 'player',
  astral_shards bigint not null default 1000,
  ether_cores bigint not null default 50,
  level integer not null default 1,
  xp bigint not null default 0,
  pwr bigint not null default 0,
  cosmic_luck numeric(8,4) not null default 1.0,
  pity_counter integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists discord_id text;
alter table public.profiles add column if not exists discord_username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'player';
alter table public.profiles add column if not exists astral_shards bigint not null default 1000;
alter table public.profiles add column if not exists ether_cores bigint not null default 50;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists xp bigint not null default 0;
alter table public.profiles add column if not exists pwr bigint not null default 0;
alter table public.profiles add column if not exists cosmic_luck numeric(8,4) not null default 1.0;
alter table public.profiles add column if not exists pity_counter integer not null default 0;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_discord_id_uidx on public.profiles(discord_id) where discord_id is not null;
create index if not exists profiles_display_name_idx on public.profiles(lower(display_name));

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.cards(id) on update cascade on delete restrict,
  copies integer not null default 1,
  is_equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, card_id)
);

create index if not exists rosters_profile_idx on public.rosters(profile_id);

create table if not exists public.game_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.economy_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null,
  delta bigint not null,
  balance_after bigint not null,
  reason text not null,
  source text not null default 'system',
  actor_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists economy_ledger_profile_idx on public.economy_ledger(profile_id, created_at desc);

create table if not exists public.gacha_rolls (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  roll_count integer not null,
  currency text not null,
  total_cost bigint not null,
  pity_before integer not null,
  pity_after integer not null,
  pulls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gacha_rolls_profile_idx on public.gacha_rolls(profile_id, created_at desc);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);

create table if not exists public.support_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  search_terms text[] not null default '{}',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Non-destructive retirement: preserve historical/mythological records but keep
-- them out of the collectible product. No DELETE and no DROP.
update public.collections
set is_active = false, updated_at = now()
where upper(id) like 'COL-05%' or upper(id) like 'COL-06%';

update public.cards
set is_active = false, is_gacha_enabled = false, updated_at = now()
where collection_id in (select id from public.collections where is_active = false and (upper(id) like 'COL-05%' or upper(id) like 'COL-06%'));

insert into public.game_settings(key, value) values
('gacha_config', '{"cost_astral":100,"cost_ether":10,"base_drop_rates":{"R":55,"SR":25,"SSR":12,"UR":6,"LR":1.7,"MR":0.3},"pity":{"start_after":10,"step_percent":0.35,"hard_pity":80},"batch":{"base_max":10,"per_10_levels":5,"hard_max":50}}'::jsonb),
('economy_config', '{"starter_astral":1000,"starter_ether":50,"recycle_multiplier":1.0}'::jsonb),
('progression_config', '{"collection_complete_bonus":250,"pwr_weights":{"atk":1.0,"def":1.0,"mag":1.1,"speed":0.8,"hp":0.15}}'::jsonb)
on conflict (key) do nothing;

-- Role and invariant constraints are added only when absent.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('player','admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_balances_nonnegative') then
    alter table public.profiles add constraint profiles_balances_nonnegative check (astral_shards >= 0 and ether_cores >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_entity_type_check') then
    alter table public.cards add constraint cards_entity_type_check check (entity_type in ('character','item','boss'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rosters_copies_positive') then
    alter table public.rosters add constraint rosters_copies_positive check (copies > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'economy_currency_check') then
    alter table public.economy_ledger add constraint economy_currency_check check (currency in ('astral_shards','ether_cores'));
  end if;
end $$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     );
$$;
revoke all on function app_private.is_admin() from public, anon;
grant execute on function app_private.is_admin() to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  discord text := coalesce(m->>'provider_id', m->>'sub', m->>'id');
  duser text := coalesce(m#>>'{custom_claims,global_name}', m->>'full_name', m->>'user_name', m->>'preferred_username', m->>'name');
  avatar text := coalesce(m->>'avatar_url', m->>'picture');
begin
  insert into public.profiles(id, discord_id, discord_username, display_name, avatar_url, role)
  values(new.id, nullif(discord,''), duser, coalesce(nullif(duser,''), 'Jogador'), avatar, 'player')
  on conflict (id) do update set
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    discord_username = coalesce(excluded.discord_username, public.profiles.discord_username),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_deckverse') then
    create trigger on_auth_user_created_deckverse
      after insert or update of raw_user_meta_data on auth.users
      for each row execute function app_private.handle_new_user();
  end if;
end $$;

create or replace function app_private.recalculate_pwr(p_profile_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  weights jsonb;
  base_value numeric := 0;
  complete_count integer := 0;
  bonus integer := 250;
  total bigint := 0;
begin
  select value->'pwr_weights', coalesce((value->>'collection_complete_bonus')::integer, 250)
    into weights, bonus from public.game_settings where key = 'progression_config';

  select coalesce(sum(
    (c.atk * coalesce((weights->>'atk')::numeric,1)) +
    (c.def * coalesce((weights->>'def')::numeric,1)) +
    (c.mag * coalesce((weights->>'mag')::numeric,1.1)) +
    (c.speed * coalesce((weights->>'speed')::numeric,.8)) +
    (c.hp * coalesce((weights->>'hp')::numeric,.15))
  ),0)
  into base_value
  from public.rosters r join public.cards c on c.id = r.card_id
  where r.profile_id = p_profile_id and r.is_equipped and c.is_active;

  select count(*) into complete_count from (
    select c.collection_id
    from public.cards c
    where c.is_active and c.is_gacha_enabled and c.collection_id is not null
    group by c.collection_id
    having count(*) = (
      select count(distinct r.card_id)
      from public.rosters r join public.cards owned on owned.id = r.card_id
      where r.profile_id = p_profile_id and owned.collection_id = c.collection_id and owned.is_active and owned.is_gacha_enabled
    )
  ) completed;

  total := round(base_value + complete_count * bonus);
  update public.profiles set pwr = total, updated_at = now() where id = p_profile_id;
  return total;
end;
$$;
revoke all on function app_private.recalculate_pwr(uuid) from public, anon, authenticated;

create or replace function app_private.roster_pwr_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.recalculate_pwr(coalesce(new.profile_id, old.profile_id));
  return coalesce(new, old);
end;
$$;
revoke all on function app_private.roster_pwr_trigger() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'deckverse_roster_pwr_refresh') then
    create trigger deckverse_roster_pwr_refresh
      after insert or update or delete on public.rosters
      for each row execute function app_private.roster_pwr_trigger();
  end if;
end $$;

create or replace function public.set_equipped_card(p_card_id text, p_equipped boolean)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare total bigint;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.rosters set is_equipped = p_equipped, updated_at = now()
  where profile_id = (select auth.uid()) and card_id = p_card_id;
  if not found then raise exception 'CARD_NOT_OWNED'; end if;
  total := app_private.recalculate_pwr((select auth.uid()));
  return total;
end;
$$;
revoke all on function public.set_equipped_card(text,boolean) from public, anon;
grant execute on function public.set_equipped_card(text,boolean) to authenticated;

create or replace function public.admin_search_profiles(p_query text)
returns table(id uuid, discord_id text, discord_username text, display_name text, avatar_url text, role text, astral_shards bigint, ether_cores bigint, level integer, pwr bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return query select p.id,p.discord_id,p.discord_username,p.display_name,p.avatar_url,p.role,p.astral_shards,p.ether_cores,p.level,p.pwr
  from public.profiles p
  where p.discord_id ilike '%' || p_query || '%'
     or p.discord_username ilike '%' || p_query || '%'
     or p.display_name ilike '%' || p_query || '%'
  order by coalesce(p.display_name,p.discord_username) limit 50;
end;
$$;
revoke all on function public.admin_search_profiles(text) from public, anon;
grant execute on function public.admin_search_profiles(text) to authenticated;

create or replace function public.admin_adjust_balance(p_profile_id uuid, p_currency text, p_amount bigint, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare new_balance bigint; actor uuid := (select auth.uid());
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_currency not in ('astral_shards','ether_cores') then raise exception 'INVALID_CURRENCY'; end if;
  if p_amount = 0 then raise exception 'ZERO_ADJUSTMENT'; end if;

  if p_currency = 'astral_shards' then
    update public.profiles set astral_shards = astral_shards + p_amount, updated_at = now()
      where id = p_profile_id and astral_shards + p_amount >= 0 returning astral_shards into new_balance;
  else
    update public.profiles set ether_cores = ether_cores + p_amount, updated_at = now()
      where id = p_profile_id and ether_cores + p_amount >= 0 returning ether_cores into new_balance;
  end if;
  if new_balance is null then raise exception 'BALANCE_WOULD_BE_NEGATIVE_OR_PROFILE_NOT_FOUND'; end if;

  insert into public.economy_ledger(profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_profile_id,p_currency,p_amount,new_balance,coalesce(nullif(p_reason,''),'Ajuste administrativo'),'admin',actor);
  insert into public.admin_audit_log(actor_profile_id,action,target_profile_id,payload)
  values(actor,'economy.adjust',p_profile_id,jsonb_build_object('currency',p_currency,'delta',p_amount,'balance_after',new_balance,'reason',p_reason));
  return jsonb_build_object('currency',p_currency,'balance',new_balance);
end;
$$;
revoke all on function public.admin_adjust_balance(uuid,text,bigint,text) from public, anon;
grant execute on function public.admin_adjust_balance(uuid,text,bigint,text) to authenticated;

create or replace function public.admin_grant_card(p_profile_id uuid, p_card_id text, p_copies integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); total integer;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_copies < 1 then raise exception 'INVALID_COPIES'; end if;
  if not exists(select 1 from public.cards where id=p_card_id and is_active) then raise exception 'CARD_NOT_FOUND'; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_profile_id,p_card_id,p_copies)
  on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies, updated_at=now()
  returning copies into total;
  insert into public.admin_audit_log(actor_profile_id,action,target_profile_id,payload) values(actor,'inventory.grant',p_profile_id,jsonb_build_object('card_id',p_card_id,'copies',p_copies,'reason',p_reason));
  return jsonb_build_object('card_id',p_card_id,'copies',total);
end; $$;
revoke all on function public.admin_grant_card(uuid,text,integer,text) from public, anon;
grant execute on function public.admin_grant_card(uuid,text,integer,text) to authenticated;

create or replace function public.admin_remove_card(p_profile_id uuid, p_card_id text, p_copies integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); current_copies integer; next_copies integer;
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select copies into current_copies from public.rosters where profile_id=p_profile_id and card_id=p_card_id for update;
  if current_copies is null then raise exception 'CARD_NOT_OWNED'; end if;
  next_copies := current_copies - greatest(1,p_copies);
  if next_copies <= 0 then delete from public.rosters where profile_id=p_profile_id and card_id=p_card_id;
  else update public.rosters set copies=next_copies,updated_at=now() where profile_id=p_profile_id and card_id=p_card_id; end if;
  insert into public.admin_audit_log(actor_profile_id,action,target_profile_id,payload) values(actor,'inventory.remove',p_profile_id,jsonb_build_object('card_id',p_card_id,'copies',p_copies,'reason',p_reason));
  return jsonb_build_object('card_id',p_card_id,'copies',greatest(next_copies,0));
end; $$;
revoke all on function public.admin_remove_card(uuid,text,integer,text) from public, anon;
grant execute on function public.admin_remove_card(uuid,text,integer,text) to authenticated;

create or replace function public.admin_transfer_card(p_from_profile_id uuid, p_to_profile_id uuid, p_card_id text, p_copies integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); current_copies integer; move_count integer := greatest(1,p_copies);
begin
  if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_from_profile_id = p_to_profile_id then raise exception 'SAME_PROFILE'; end if;
  select copies into current_copies from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id for update;
  if current_copies is null or current_copies < move_count then raise exception 'INSUFFICIENT_COPIES'; end if;
  if current_copies = move_count then delete from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id;
  else update public.rosters set copies=copies-move_count,updated_at=now() where profile_id=p_from_profile_id and card_id=p_card_id; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_to_profile_id,p_card_id,move_count)
  on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now();
  insert into public.admin_audit_log(actor_profile_id,action,target_profile_id,payload) values(actor,'inventory.transfer',p_to_profile_id,jsonb_build_object('from',p_from_profile_id,'card_id',p_card_id,'copies',move_count,'reason',p_reason));
  return jsonb_build_object('success',true,'card_id',p_card_id,'copies',move_count);
end; $$;
revoke all on function public.admin_transfer_card(uuid,uuid,text,integer,text) from public, anon;
grant execute on function public.admin_transfer_card(uuid,uuid,text,integer,text) to authenticated;

create or replace function public.roll_gacha(p_count integer default 1, p_currency text default 'astral_shards')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  prof public.profiles%rowtype;
  cfg jsonb;
  rates jsonb;
  pity_cfg jsonb;
  batch_cfg jsonb;
  max_batch integer;
  unit_cost integer;
  total_cost bigint;
  i integer;
  pity integer;
  pity_before integer;
  start_after integer;
  hard_pity integer;
  step_percent numeric;
  boost numeric;
  roll_value numeric;
  r_r numeric; r_sr numeric; r_ssr numeric; r_ur numeric; r_lr numeric; r_mr numeric;
  selected_rarity text;
  selected_card public.cards%rowtype;
  pulls jsonb := '[]'::jsonb;
  new_balance bigint;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_currency not in ('astral_shards','ether_cores') then raise exception 'INVALID_CURRENCY'; end if;
  select * into prof from public.profiles where id=uid for update;
  if prof.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  select value into cfg from public.game_settings where key='gacha_config';
  if cfg is null then raise exception 'GACHA_CONFIG_MISSING'; end if;
  rates := cfg->'base_drop_rates'; pity_cfg := cfg->'pity'; batch_cfg := cfg->'batch';
  max_batch := least(coalesce((batch_cfg->>'hard_max')::int,50), coalesce((batch_cfg->>'base_max')::int,10) + floor(prof.level/10.0)::int * coalesce((batch_cfg->>'per_10_levels')::int,5));
  if p_count < 1 or p_count > max_batch then raise exception 'ROLL_COUNT_EXCEEDS_LEVEL_LIMIT'; end if;
  unit_cost := case when p_currency='astral_shards' then coalesce((cfg->>'cost_astral')::int,100) else coalesce((cfg->>'cost_ether')::int,10) end;
  total_cost := unit_cost * p_count;
  if (p_currency='astral_shards' and prof.astral_shards < total_cost) or (p_currency='ether_cores' and prof.ether_cores < total_cost) then raise exception 'INSUFFICIENT_BALANCE'; end if;

  if p_currency='astral_shards' then update public.profiles set astral_shards=astral_shards-total_cost where id=uid returning astral_shards into new_balance;
  else update public.profiles set ether_cores=ether_cores-total_cost where id=uid returning ether_cores into new_balance; end if;
  insert into public.economy_ledger(profile_id,currency,delta,balance_after,reason,source) values(uid,p_currency,-total_cost,new_balance,'Gacha','gacha');

  pity := prof.pity_counter; pity_before := pity;
  start_after := coalesce((pity_cfg->>'start_after')::int,10);
  hard_pity := coalesce((pity_cfg->>'hard_pity')::int,80);
  step_percent := coalesce((pity_cfg->>'step_percent')::numeric,.35);

  for i in 1..p_count loop
    r_sr := coalesce((rates->>'SR')::numeric,25); r_ssr := coalesce((rates->>'SSR')::numeric,12);
    r_ur := coalesce((rates->>'UR')::numeric,6); r_lr := coalesce((rates->>'LR')::numeric,1.7); r_mr := coalesce((rates->>'MR')::numeric,.3);
    boost := least(25, greatest(0,pity-start_after) * step_percent);
    r_ur := r_ur + boost*.80; r_lr := r_lr + boost*.15; r_mr := r_mr + boost*.05;
    r_r := greatest(0, 100 - r_sr - r_ssr - r_ur - r_lr - r_mr);

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

    insert into public.rosters(profile_id,card_id,copies) values(uid,selected_card.id,1)
    on conflict(profile_id,card_id) do update set copies=public.rosters.copies+1,updated_at=now();
    pulls := pulls || jsonb_build_array(jsonb_build_object('card_id',selected_card.id,'name',selected_card.name,'rarity',selected_card.rarity,'entity_type',selected_card.entity_type,'image_url',selected_card.image_url));
    if selected_card.rarity in ('UR','LR','MR') then pity := 0; else pity := pity + 1; end if;
  end loop;

  update public.profiles set pity_counter=pity,cosmic_luck=1+(pity*.01),updated_at=now() where id=uid;
  insert into public.gacha_rolls(profile_id,roll_count,currency,total_cost,pity_before,pity_after,pulls) values(uid,p_count,p_currency,total_cost,pity_before,pity,pulls);
  return jsonb_build_object('pulls',pulls,'pity_before',pity_before,'pity_after',pity,'currency',p_currency,'cost',total_cost,'balance_after',new_balance,'max_batch',max_batch);
end;
$$;
revoke all on function public.roll_gacha(integer,text) from public, anon;
grant execute on function public.roll_gacha(integer,text) to authenticated;

-- RLS: all exposed tables are explicitly protected.
alter table public.collections enable row level security;
alter table public.cards enable row level security;
alter table public.card_forms enable row level security;
alter table public.profiles enable row level security;
alter table public.rosters enable row level security;
alter table public.game_settings enable row level security;
alter table public.economy_ledger enable row level security;
alter table public.gacha_rolls enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.support_entries enable row level security;

-- Recreate policies safely.
do $$ declare pol record; begin
  for pol in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('collections','cards','card_forms','profiles','rosters','game_settings','economy_ledger','gacha_rolls','admin_audit_log','support_entries') loop
    execute format('drop policy if exists %I on %I.%I',pol.policyname,pol.schemaname,pol.tablename);
  end loop;
end $$;

create policy collections_public_read on public.collections for select to anon, authenticated using (is_active or app_private.is_admin());
create policy collections_admin_write on public.collections for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy cards_public_read on public.cards for select to anon, authenticated using (is_active or app_private.is_admin());
create policy cards_admin_write on public.cards for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy forms_public_read on public.card_forms for select to anon, authenticated using (is_active or app_private.is_admin());
create policy forms_admin_write on public.card_forms for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy profiles_self_or_admin_read on public.profiles for select to authenticated using ((select auth.uid())=id or app_private.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy profiles_admin_all on public.profiles for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy rosters_self_or_admin_read on public.rosters for select to authenticated using ((select auth.uid())=profile_id or app_private.is_admin());
create policy game_settings_public_read on public.game_settings for select to anon, authenticated using (true);
create policy game_settings_admin_write on public.game_settings for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
create policy economy_self_or_admin_read on public.economy_ledger for select to authenticated using ((select auth.uid())=profile_id or app_private.is_admin());
create policy gacha_self_or_admin_read on public.gacha_rolls for select to authenticated using ((select auth.uid())=profile_id or app_private.is_admin());
create policy admin_audit_admin_read on public.admin_audit_log for select to authenticated using (app_private.is_admin());
create policy support_public_read on public.support_entries for select to anon, authenticated using (is_active or app_private.is_admin());
create policy support_admin_write on public.support_entries for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());

-- Data API privileges. RLS still controls which rows are visible.
grant usage on schema public to anon, authenticated;
grant select on public.collections, public.cards, public.card_forms, public.game_settings, public.support_entries to anon, authenticated;
grant select on public.profiles, public.rosters, public.economy_ledger, public.gacha_rolls, public.admin_audit_log to authenticated;
grant update(display_name, updated_at) on public.profiles to authenticated;
grant update(value, updated_at) on public.game_settings to authenticated;
grant insert, update, delete on public.collections, public.cards, public.card_forms, public.support_entries to authenticated;

-- Users do not get direct mutation rights over economy, roster copies or audit logs.
revoke insert, delete on public.profiles from authenticated;
revoke insert, update, delete on public.rosters from authenticated;
revoke insert, update, delete on public.economy_ledger from authenticated;
revoke insert, update, delete on public.gacha_rolls from authenticated;
revoke insert, update, delete on public.admin_audit_log from authenticated;
