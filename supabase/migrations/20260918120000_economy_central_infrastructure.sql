-- DeckVerse-OS central economy infrastructure phase.
-- Live database changes for this migration were verified before committing this file.
-- Deck Credits remain the canonical currency.

alter table public.economy_ledger add column if not exists transaction_id uuid;
update public.economy_ledger set transaction_id=gen_random_uuid() where transaction_id is null;
alter table public.economy_ledger alter column transaction_id set not null;
create unique index if not exists economy_ledger_transaction_player_uidx on public.economy_ledger(transaction_id,profile_id);

alter table public.economy_transactions add column if not exists transaction_id uuid;
update public.economy_transactions set transaction_id=id where transaction_id is null;
alter table public.economy_transactions alter column transaction_id set not null;
create unique index if not exists economy_transactions_transaction_player_uidx on public.economy_transactions(transaction_id,player_id);
create index if not exists economy_transactions_transaction_idx on public.economy_transactions(transaction_id);

create table if not exists public.economy_audit_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  player_id uuid references public.profiles(id),
  amount bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.economy_audit_events enable row level security;
revoke all on public.economy_audit_events from public,anon,authenticated;
create index if not exists economy_audit_events_type_time_idx on public.economy_audit_events(event_type,created_at desc);
create index if not exists economy_audit_events_transaction_idx on public.economy_audit_events(transaction_id);

create or replace function public.capture_economy_transaction_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.economy_audit_events(transaction_id,event_type,entity_type,entity_id,player_id,amount,metadata)
  values(new.transaction_id,case when new.amount>0 then 'CREDITS_GENERATED' when new.amount<0 then 'CREDITS_CONSUMED' else 'CREDITS_ZERO' end,'ECONOMY_TRANSACTION',new.id::text,new.player_id,new.amount,
    jsonb_build_object('transaction_type',new.transaction_type,'reference_type',new.reference_type,'reference_id',new.reference_id,'balance_before',new.balance_before,'balance_after',new.balance_after));
  return new;
end $$;
drop trigger if exists economy_transaction_audit_trigger on public.economy_transactions;
create trigger economy_transaction_audit_trigger after insert on public.economy_transactions for each row execute function public.capture_economy_transaction_audit();
revoke execute on function public.capture_economy_transaction_audit() from public,anon,authenticated;

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  target_profile_id uuid references public.profiles(id),
  transaction_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.economy_logs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  player_id uuid references public.profiles(id),
  event_type text not null,
  amount bigint,
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  error_code text,
  message text not null,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.system_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.economy_logs enable row level security;
alter table public.error_logs enable row level security;
revoke all on public.system_logs,public.audit_logs,public.economy_logs,public.error_logs from public,anon,authenticated;

create or replace function public.capture_economy_log()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.economy_logs(transaction_id,player_id,event_type,amount,reference_type,reference_id,metadata)
  values(new.transaction_id,new.player_id,new.transaction_type,new.amount,new.reference_type,new.reference_id,jsonb_build_object('balance_before',new.balance_before,'balance_after',new.balance_after));
  return new;
end $$;
drop trigger if exists economy_transaction_observability_trigger on public.economy_transactions;
create trigger economy_transaction_observability_trigger after insert on public.economy_transactions for each row execute function public.capture_economy_log();
revoke execute on function public.capture_economy_log() from public,anon,authenticated;

alter table public.admin_audit_log add column if not exists transaction_id uuid;
create index if not exists admin_audit_log_transaction_idx on public.admin_audit_log(transaction_id);
create unique index if not exists admin_audit_log_inventory_transaction_uidx on public.admin_audit_log(transaction_id,action,target_profile_id)
where transaction_id is not null and action like 'inventory.%';

create or replace function public.capture_admin_audit_log()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.audit_logs(actor_profile_id,action,target_profile_id,transaction_id,payload)
  values(new.actor_profile_id,new.action,new.target_profile_id,new.transaction_id,new.payload);
  return new;
end $$;
drop trigger if exists admin_audit_observability_trigger on public.admin_audit_log;
create trigger admin_audit_observability_trigger after insert on public.admin_audit_log for each row execute function public.capture_admin_audit_log();
revoke execute on function public.capture_admin_audit_log() from public,anon,authenticated;

create table if not exists public.feature_flags (
  name text not null,
  enabled boolean not null default false,
  environment text not null default 'production',
  description text not null default '',
  updated_at timestamptz not null default now(),
  primary key(name,environment)
);
alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from public,anon,authenticated;
insert into public.feature_flags(name,enabled,environment,description) values
('economy_v2',true,'production','Economy Engine and transaction ledger'),
('gacha_v2',false,'production','Next-generation Gacha'),
('guild_wars',false,'production','Guild Wars gameplay'),
('auction_house',false,'production','Auction House'),
('season_pass',false,'production','Season Pass'),
('event_system',false,'production','Event-driven gameplay systems')
on conflict(name,environment) do update set description=excluded.description,updated_at=now();

create or replace function public.feature_flag_is_enabled(p_name text,p_environment text default 'production')
returns boolean language sql security invoker set search_path=''
as $$ select coalesce((select enabled from public.feature_flags where name=p_name and environment=p_environment),false) $$;
create or replace function public.feature_flags_snapshot(p_environment text default 'production')
returns jsonb language sql security definer set search_path=''
as $$ select coalesce(jsonb_object_agg(name,enabled order by name),'{}'::jsonb) from public.feature_flags where environment=p_environment $$;
create or replace function public.set_feature_flag(p_name text,p_enabled boolean,p_environment text default 'production',p_description text default '')
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  insert into public.feature_flags(name,enabled,environment,description) values(p_name,p_enabled,p_environment,coalesce(p_description,''))
  on conflict(name,environment) do update set enabled=excluded.enabled,description=excluded.description,updated_at=now();
  return jsonb_build_object('success',true,'name',p_name,'enabled',p_enabled,'environment',p_environment);
end $$;
revoke execute on function public.feature_flag_is_enabled(text,text) from public,anon;
revoke execute on function public.feature_flags_snapshot(text) from public,anon;
revoke execute on function public.set_feature_flag(text,boolean,text,text) from public,anon;
grant execute on function public.feature_flag_is_enabled(text,text) to authenticated;
grant execute on function public.feature_flags_snapshot(text) to authenticated;
grant execute on function public.set_feature_flag(text,boolean,text,text) to authenticated;

create or replace function public.record_error_log(p_error_code text,p_message text,p_source text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.error_logs(actor_profile_id,error_code,message,source,metadata) values(auth.uid(),p_error_code,p_message,p_source,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('success',true);
end $$;
create or replace function public.record_system_log(p_event_type text,p_entity_type text default null,p_entity_id text default null,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.system_logs(actor_profile_id,event_type,entity_type,entity_id,metadata) values(auth.uid(),p_event_type,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('success',true);
end $$;
revoke execute on function public.record_error_log(text,text,text,jsonb) from public,anon;
revoke execute on function public.record_system_log(text,text,text,jsonb) from public,anon;
grant execute on function public.record_error_log(text,text,text,jsonb) to authenticated;
grant execute on function public.record_system_log(text,text,text,jsonb) to authenticated;

create or replace function public.economy_audit_record_card(p_transaction_id uuid,p_event_type text,p_card_id text,p_player_id uuid,p_quantity bigint,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  if p_event_type not in ('CARD_GENERATED','CARD_DESTROYED') then raise exception 'INVALID_AUDIT_EVENT'; end if;
  insert into public.economy_audit_events(transaction_id,event_type,entity_type,entity_id,player_id,amount,metadata)
  values(p_transaction_id,p_event_type,'CARD',p_card_id,p_player_id,p_quantity,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('success',true);
end $$;
revoke execute on function public.economy_audit_record_card(uuid,text,text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.economy_audit_record_card(uuid,text,text,uuid,bigint,jsonb) to authenticated;

create or replace function public.economy_audit_snapshot()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  with wealth as (select coalesce(sum(deck_credits),0)::bigint total,coalesce(avg(deck_credits),0)::numeric avg from public.profiles),
  today as (select coalesce(sum(case when amount>0 then amount else 0 end),0)::bigint generated,coalesce(sum(case when amount<0 then abs(amount) else 0 end),0)::bigint consumed from public.economy_transactions where created_at>=date_trunc('day',now())),
  cards as (select coalesce(sum(case when event_type='CARD_GENERATED' then amount else 0 end),0)::bigint generated,coalesce(sum(case when event_type='CARD_DESTROYED' then amount else 0 end),0)::bigint destroyed from public.economy_audit_events),
  market as (select coalesce(avg(price_dc) filter(where status='sold'),0)::numeric avg_price,coalesce(sum(price_dc) filter(where status='sold'),0)::bigint volume from public.market_listings),
  top_players as (select coalesce(jsonb_agg(jsonb_build_object('player_id',id,'display_name',coalesce(display_name,username),'deck_credits',deck_credits) order by deck_credits desc),'[]'::jsonb) value from (select id,display_name,username,deck_credits from public.profiles order by deck_credits desc limit 10)p),
  top_collections as (select coalesce(jsonb_agg(jsonb_build_object('collection_id',collection_id,'collection_name',collection_name,'trades',trades) order by trades desc),'[]'::jsonb) value from (select c.collection_id,col.name collection_name,count(*)::bigint trades from public.economy_transactions et join public.market_listings ml on et.reference_type='MARKETPLACE' and et.reference_id=ml.id::text join public.cards c on c.id=ml.card_id left join public.collections col on col.id=c.collection_id where et.transaction_type='MARKETPLACE_SALE' group by c.collection_id,col.name order by trades desc limit 10)q),
  top_cards as (select coalesce(jsonb_agg(jsonb_build_object('card_id',card_id,'card_name',card_name,'trades',trades) order by trades desc),'[]'::jsonb) value from (select ml.card_id,c.name card_name,count(*)::bigint trades from public.economy_transactions et join public.market_listings ml on et.reference_type='MARKETPLACE' and et.reference_id=ml.id::text join public.cards c on c.id=ml.card_id where et.transaction_type='MARKETPLACE_SALE' group by ml.card_id,c.name order by trades desc limit 10)q)
  select jsonb_build_object('DeckCreditsInCirculation',w.total,'CreditsGeneratedToday',t.generated,'CreditsConsumedToday',t.consumed,'AveragePlayerWealth',w.avg,'TotalCardsGenerated',c.generated,'TotalCardsDestroyed',c.destroyed,'AverageMarketPrice',m.avg_price,'MarketVolume',m.volume,'TopCollections',tc.value,'TopTradedCards',trc.value,'TopPlayers',tp.value,'TopGuilds','[]'::jsonb,'TransactionsToday',(select count(*) from public.economy_transactions where created_at>=date_trunc('day',now())),'CardsTradedToday',(select coalesce(sum(quantity),0) from public.market_listings where status='sold' and completed_at>=date_trunc('day',now())),'MarketVolumeToday',(select coalesce(sum(price_dc),0) from public.market_listings where status='sold' and completed_at>=date_trunc('day',now()))) into result
  from wealth w cross join today t cross join cards c cross join market m cross join top_players tp cross join top_collections tc cross join top_cards trc;
  return result;
end $$;
revoke execute on function public.economy_audit_snapshot() from public,anon;
grant execute on function public.economy_audit_snapshot() to authenticated;

create or replace function public.observability_snapshot()
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object(
    'PlayersOnline',0,
    'TransactionsToday',(select count(*) from public.economy_logs where created_at>=date_trunc('day',now())),
    'CreditsGenerated',(select coalesce(sum(amount),0) from public.economy_logs where amount>0 and created_at>=date_trunc('day',now())),
    'CreditsConsumed',(select coalesce(sum(abs(amount)),0) from public.economy_logs where amount<0 and created_at>=date_trunc('day',now())),
    'CardsCreated',(select coalesce(sum(amount),0) from public.economy_audit_events where event_type='CARD_GENERATED'),
    'CardsTraded',(select coalesce(sum(quantity),0) from public.market_listings where status='sold'),
    'AverageMarketPrice',(select coalesce(avg(price_dc),0) from public.market_listings where status='sold'),
    'MarketVolume',(select coalesce(sum(price_dc),0) from public.market_listings where status='sold'),
    'TopGuilds','[]'::jsonb,
    'ErrorsToday',(select count(*) from public.error_logs where created_at>=date_trunc('day',now())),
    'AuditEventsToday',(select count(*) from public.audit_logs where created_at>=date_trunc('day',now()))
  );
end $$;
revoke execute on function public.observability_snapshot() from public,anon;
grant execute on function public.observability_snapshot() to authenticated;

alter table public.admin_audit_log enable row level security;

create or replace function app_private.admin_grant_card_for_transaction(p_actor uuid,p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare total integer; existing jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  select payload into existing from public.admin_audit_log where transaction_id=p_transaction_id and action='inventory.grant' and target_profile_id=p_profile_id limit 1;
  if existing is not null then return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'payload',existing); end if;
  if p_copies<1 then raise exception 'INVALID_COPIES'; end if;
  if not exists(select 1 from public.cards where id=p_card_id and is_active) then raise exception 'CARD_NOT_FOUND'; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_profile_id,p_card_id,p_copies) on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now() returning copies into total;
  insert into public.admin_audit_log(transaction_id,actor_profile_id,action,target_profile_id,payload) values(p_transaction_id,p_actor,'inventory.grant',p_profile_id,jsonb_build_object('card_id',p_card_id,'copies',p_copies,'reason',p_reason,'transaction_id',p_transaction_id));
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'card_id',p_card_id,'copies',total);
end $$;
create or replace function app_private.admin_remove_card_for_transaction(p_actor uuid,p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare current_copies integer; next_copies integer; existing jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  select payload into existing from public.admin_audit_log where transaction_id=p_transaction_id and action='inventory.remove' and target_profile_id=p_profile_id limit 1;
  if existing is not null then return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'payload',existing); end if;
  select copies into current_copies from public.rosters where profile_id=p_profile_id and card_id=p_card_id for update;
  if current_copies is null then raise exception 'CARD_NOT_OWNED'; end if;
  next_copies:=current_copies-greatest(1,p_copies);
  if next_copies<=0 then delete from public.rosters where profile_id=p_profile_id and card_id=p_card_id; else update public.rosters set copies=next_copies,updated_at=now() where profile_id=p_profile_id and card_id=p_card_id; end if;
  insert into public.admin_audit_log(transaction_id,actor_profile_id,action,target_profile_id,payload) values(p_transaction_id,p_actor,'inventory.remove',p_profile_id,jsonb_build_object('card_id',p_card_id,'copies',p_copies,'reason',p_reason,'transaction_id',p_transaction_id));
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'card_id',p_card_id,'copies',greatest(next_copies,0));
end $$;
create or replace function app_private.admin_transfer_card_for_transaction(p_actor uuid,p_from_profile_id uuid,p_to_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare current_copies integer; move_count integer:=greatest(1,p_copies); existing jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_from_profile_id=p_to_profile_id then raise exception 'SAME_PROFILE'; end if;
  select payload into existing from public.admin_audit_log where transaction_id=p_transaction_id and action='inventory.transfer' and target_profile_id=p_to_profile_id limit 1;
  if existing is not null then return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'payload',existing); end if;
  select copies into current_copies from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id for update;
  if current_copies is null or current_copies<move_count then raise exception 'INSUFFICIENT_COPIES'; end if;
  if current_copies=move_count then delete from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id; else update public.rosters set copies=copies-move_count,updated_at=now() where profile_id=p_from_profile_id and card_id=p_card_id; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_to_profile_id,p_card_id,move_count) on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now();
  insert into public.admin_audit_log(transaction_id,actor_profile_id,action,target_profile_id,payload) values(p_transaction_id,p_actor,'inventory.transfer',p_to_profile_id,jsonb_build_object('from',p_from_profile_id,'card_id',p_card_id,'copies',move_count,'reason',p_reason,'transaction_id',p_transaction_id));
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'card_id',p_card_id,'copies',move_count);
end $$;

create or replace function public.admin_grant_card_with_transaction(p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$ declare actor uuid:=(select auth.uid()); begin if actor is null or not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; return app_private.admin_grant_card_for_transaction(actor,p_profile_id,p_card_id,p_copies,p_reason,p_transaction_id); end $$;
create or replace function public.admin_remove_card_with_transaction(p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$ declare actor uuid:=(select auth.uid()); begin if actor is null or not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; return app_private.admin_remove_card_for_transaction(actor,p_profile_id,p_card_id,p_copies,p_reason,p_transaction_id); end $$;
create or replace function public.admin_transfer_card_with_transaction(p_from_profile_id uuid,p_to_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$ declare actor uuid:=(select auth.uid()); begin if actor is null or not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if; return app_private.admin_transfer_card_for_transaction(actor,p_from_profile_id,p_to_profile_id,p_card_id,p_copies,p_reason,p_transaction_id); end $$;
revoke execute on function public.admin_grant_card_with_transaction(uuid,text,integer,text,uuid) from public,anon;
revoke execute on function public.admin_remove_card_with_transaction(uuid,text,integer,text,uuid) from public,anon;
revoke execute on function public.admin_transfer_card_with_transaction(uuid,uuid,text,integer,text,uuid) from public,anon;
grant execute on function public.admin_grant_card_with_transaction(uuid,text,integer,text,uuid) to authenticated;
grant execute on function public.admin_remove_card_with_transaction(uuid,text,integer,text,uuid) to authenticated;
grant execute on function public.admin_transfer_card_with_transaction(uuid,uuid,text,integer,text,uuid) to authenticated;

-- Existing marketplace/currency RPCs remain the public entry points; transaction-aware
-- variants are the new canonical paths used by the Repository Layer.
revoke execute on function public.buy_market_listing(uuid) from public,anon;
revoke execute on function public.create_market_listing(text,integer,bigint) from public,anon;
revoke execute on function public.cancel_market_listing(uuid) from public,anon;
grant execute on function public.buy_market_listing(uuid) to authenticated;
grant execute on function public.create_market_listing(text,integer,bigint) to authenticated;
grant execute on function public.cancel_market_listing(uuid) to authenticated;
