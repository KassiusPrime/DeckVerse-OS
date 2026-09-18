-- Canonical transaction-aware Deck Credits paths.
-- Depends on 20260918113418_add_economy_transactions_and_atomic_currency_rpcs.

create or replace function public.grant_currency_with_transaction(
  p_player_id uuid,p_amount bigint,p_transaction_type text,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency grant',p_transaction_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare before_balance bigint; after_balance bigint; existing public.economy_transactions%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_transaction_type not in ('QUEST_REWARD','PACK_REWARD','ADMIN_GRANT','GUILD_REWARD','EVENT_REWARD') then raise exception 'INVALID_TRANSACTION_TYPE'; end if;
  select deck_credits into before_balance from public.profiles where id=p_player_id for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if auth.uid()<>p_player_id and not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  select * into existing from public.economy_transactions where transaction_id=p_transaction_id limit 1;
  if existing.id is not null then
    if existing.player_id<>p_player_id or existing.transaction_type<>p_transaction_type or existing.amount<>p_amount
      or coalesce(existing.reference_type,'')<>coalesce(p_reference_type,'') or coalesce(existing.reference_id,'')<>coalesce(p_reference_id,'') then raise exception 'TRANSACTION_ID_CONFLICT'; end if;
    return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'player_id',p_player_id,'balance_after',existing.balance_after);
  end if;
  after_balance:=before_balance+p_amount;
  update public.profiles set deck_credits=after_balance,updated_at=now() where id=p_player_id;
  insert into public.economy_transactions(transaction_id,player_id,transaction_type,amount,balance_before,balance_after,reference_type,reference_id)
  values(p_transaction_id,p_player_id,p_transaction_type,p_amount,before_balance,after_balance,p_reference_type,p_reference_id);
  insert into public.economy_ledger(transaction_id,profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_transaction_id,p_player_id,'deck_credits',p_amount,after_balance,p_reason,'economy',auth.uid());
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'player_id',p_player_id,'amount',p_amount,'balance_before',before_balance,'balance_after',after_balance);
end $$;

create or replace function public.remove_currency_with_transaction(
  p_player_id uuid,p_amount bigint,p_transaction_type text,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency removal',p_transaction_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare before_balance bigint; after_balance bigint; existing public.economy_transactions%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_transaction_type not in ('PACK_PURCHASE','MARKETPLACE_PURCHASE','ADMIN_REMOVE') then raise exception 'INVALID_TRANSACTION_TYPE'; end if;
  select deck_credits into before_balance from public.profiles where id=p_player_id for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if auth.uid()<>p_player_id and not exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  select * into existing from public.economy_transactions where transaction_id=p_transaction_id limit 1;
  if existing.id is not null then
    if existing.player_id<>p_player_id or existing.transaction_type<>p_transaction_type or existing.amount<>-p_amount
      or coalesce(existing.reference_type,'')<>coalesce(p_reference_type,'') or coalesce(existing.reference_id,'')<>coalesce(p_reference_id,'') then raise exception 'TRANSACTION_ID_CONFLICT'; end if;
    return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'player_id',p_player_id,'balance_after',existing.balance_after);
  end if;
  if before_balance<p_amount then raise exception 'INSUFFICIENT_DECK_CREDITS'; end if;
  after_balance:=before_balance-p_amount;
  update public.profiles set deck_credits=after_balance,updated_at=now() where id=p_player_id;
  insert into public.economy_transactions(transaction_id,player_id,transaction_type,amount,balance_before,balance_after,reference_type,reference_id)
  values(p_transaction_id,p_player_id,p_transaction_type,-p_amount,before_balance,after_balance,p_reference_type,p_reference_id);
  insert into public.economy_ledger(transaction_id,profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_transaction_id,p_player_id,'deck_credits',-p_amount,after_balance,p_reason,'economy',auth.uid());
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'player_id',p_player_id,'amount',-p_amount,'balance_before',before_balance,'balance_after',after_balance);
end $$;

create or replace function public.transfer_currency_with_transaction(
  p_from uuid,p_to uuid,p_amount bigint,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency transfer',p_transaction_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare fb bigint; tb bigint; actor uuid:=auth.uid(); from_existing public.economy_transactions%rowtype; to_existing public.economy_transactions%rowtype;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_from=p_to then raise exception 'SAME_PLAYER_TRANSFER'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if actor<>p_from and not exists(select 1 from public.profiles where id=actor and role in ('owner','admin')) then raise exception 'FORBIDDEN'; end if;
  select * into from_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=p_from limit 1;
  select * into to_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=p_to limit 1;
  if from_existing.id is not null or to_existing.id is not null then
    if from_existing.id is null or to_existing.id is null or from_existing.amount<>-p_amount or to_existing.amount<>p_amount
      or from_existing.transaction_type<>'TRANSFER' or to_existing.transaction_type<>'TRANSFER'
      or coalesce(from_existing.reference_type,'')<>coalesce(p_reference_type,'') or coalesce(from_existing.reference_id,'')<>coalesce(p_reference_id,'') then raise exception 'TRANSACTION_ID_CONFLICT'; end if;
    return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'from_balance',from_existing.balance_after,'to_balance',to_existing.balance_after,'amount',p_amount);
  end if;
  if p_from<p_to then
    select deck_credits into fb from public.profiles where id=p_from for update;
    select deck_credits into tb from public.profiles where id=p_to for update;
  else
    select deck_credits into tb from public.profiles where id=p_to for update;
    select deck_credits into fb from public.profiles where id=p_from for update;
  end if;
  if fb is null or tb is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  if fb<p_amount then raise exception 'INSUFFICIENT_DECK_CREDITS'; end if;
  update public.profiles set deck_credits=fb-p_amount,updated_at=now() where id=p_from;
  update public.profiles set deck_credits=tb+p_amount,updated_at=now() where id=p_to;
  insert into public.economy_transactions(transaction_id,player_id,transaction_type,amount,balance_before,balance_after,reference_type,reference_id)
  values(p_transaction_id,p_from,'TRANSFER',-p_amount,fb,fb-p_amount,p_reference_type,p_reference_id),(p_transaction_id,p_to,'TRANSFER',p_amount,tb,tb+p_amount,p_reference_type,p_reference_id);
  insert into public.economy_ledger(transaction_id,profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_transaction_id,p_from,'deck_credits',-p_amount,fb-p_amount,p_reason,'economy',actor),(p_transaction_id,p_to,'deck_credits',p_amount,tb+p_amount,p_reason,'economy',actor);
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'from_balance',fb-p_amount,'to_balance',tb+p_amount,'amount',p_amount);
end $$;

create or replace function public.grant_currency(p_player_id uuid,p_amount bigint,p_transaction_type text,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency grant')
returns jsonb language sql security definer set search_path=''
as $$ select public.grant_currency_with_transaction(p_player_id,p_amount,p_transaction_type,p_reference_type,p_reference_id,p_reason,gen_random_uuid()) $$;
create or replace function public.remove_currency(p_player_id uuid,p_amount bigint,p_transaction_type text,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency removal')
returns jsonb language sql security definer set search_path=''
as $$ select public.remove_currency_with_transaction(p_player_id,p_amount,p_transaction_type,p_reference_type,p_reference_id,p_reason,gen_random_uuid()) $$;
create or replace function public.transfer_currency(p_from uuid,p_to uuid,p_amount bigint,p_reference_type text default null,p_reference_id text default null,p_reason text default 'Currency transfer')
returns jsonb language sql security definer set search_path=''
as $$ select public.transfer_currency_with_transaction(p_from,p_to,p_amount,p_reference_type,p_reference_id,p_reason,gen_random_uuid()) $$;

create or replace function public.buy_market_listing_with_transaction(p_listing_id uuid,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); listing public.market_listings%rowtype; buyer_balance bigint; seller_balance bigint;
buyer_existing public.economy_transactions%rowtype; seller_existing public.economy_transactions%rowtype; cfg jsonb; fee_rate numeric; seller_gain bigint;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  select * into listing from public.market_listings where id=p_listing_id for update;
  if listing.id is null then raise exception 'LISTING_NOT_FOUND'; end if;
  if listing.seller_profile_id=uid then raise exception 'CANNOT_BUY_OWN_LISTING'; end if;
  select * into buyer_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=uid limit 1;
  select * into seller_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=listing.seller_profile_id limit 1;
  if buyer_existing.id is not null or seller_existing.id is not null then
    select value into cfg from public.game_settings where key='economy_v2';
    fee_rate:=coalesce((cfg->>'trade_fee_rate')::numeric,.05);
    seller_gain:=floor(listing.price_dc*(1-fee_rate));
    if buyer_existing.id is null or seller_existing.id is null or buyer_existing.transaction_type<>'MARKETPLACE_PURCHASE' or seller_existing.transaction_type<>'MARKETPLACE_SALE'
      or buyer_existing.amount<>-listing.price_dc or seller_existing.amount<>seller_gain or buyer_existing.reference_type<>'MARKETPLACE' or seller_existing.reference_type<>'MARKETPLACE'
      or buyer_existing.reference_id<>p_listing_id::text or seller_existing.reference_id<>p_listing_id::text then raise exception 'TRANSACTION_ID_CONFLICT'; end if;
    return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'listing_id',p_listing_id,'card_id',listing.card_id,'quantity',listing.quantity,'paid_dc',listing.price_dc,'seller_received_dc',seller_gain,'buyer_balance_dc',buyer_existing.balance_after);
  end if;
  if listing.status<>'active' then raise exception 'LISTING_NOT_ACTIVE'; end if;
  select value into cfg from public.game_settings where key='economy_v2';
  fee_rate:=coalesce((cfg->>'trade_fee_rate')::numeric,.05);
  seller_gain:=floor(listing.price_dc*(1-fee_rate));
  if uid<listing.seller_profile_id then
    select deck_credits into buyer_balance from public.profiles where id=uid for update;
    select deck_credits into seller_balance from public.profiles where id=listing.seller_profile_id for update;
  else
    select deck_credits into seller_balance from public.profiles where id=listing.seller_profile_id for update;
    select deck_credits into buyer_balance from public.profiles where id=uid for update;
  end if;
  if buyer_balance<listing.price_dc then raise exception 'INSUFFICIENT_DECK_CREDITS'; end if;
  update public.profiles set deck_credits=buyer_balance-listing.price_dc,updated_at=now() where id=uid;
  update public.profiles set deck_credits=seller_balance+seller_gain,updated_at=now() where id=listing.seller_profile_id;
  insert into public.rosters(profile_id,card_id,copies) values(uid,listing.card_id,listing.quantity) on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now();
  update public.market_listings set status='sold',buyer_profile_id=uid,updated_at=now(),completed_at=now() where id=p_listing_id;
  insert into public.economy_transactions(transaction_id,player_id,transaction_type,amount,balance_before,balance_after,reference_type,reference_id)
  values(p_transaction_id,uid,'MARKETPLACE_PURCHASE',-listing.price_dc,buyer_balance,buyer_balance-listing.price_dc,'MARKETPLACE',p_listing_id::text),
    (p_transaction_id,listing.seller_profile_id,'MARKETPLACE_SALE',seller_gain,seller_balance,seller_balance+seller_gain,'MARKETPLACE',p_listing_id::text);
  insert into public.economy_ledger(transaction_id,profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_transaction_id,uid,'deck_credits',-listing.price_dc,buyer_balance-listing.price_dc,'Compra no mercado','market',uid),
    (p_transaction_id,listing.seller_profile_id,'deck_credits',seller_gain,seller_balance+seller_gain,'Venda no mercado','market',uid);
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'listing_id',p_listing_id,'card_id',listing.card_id,'quantity',listing.quantity,'paid_dc',listing.price_dc,'seller_received_dc',seller_gain,'buyer_balance_dc',buyer_balance-listing.price_dc);
end $$;

create or replace function public.buy_market_listing(p_listing_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$ begin return public.buy_market_listing_with_transaction(p_listing_id,gen_random_uuid()); end $$;

revoke execute on function public.grant_currency_with_transaction(uuid,bigint,text,text,text,text,uuid) from public,anon;
revoke execute on function public.remove_currency_with_transaction(uuid,bigint,text,text,text,text,uuid) from public,anon;
revoke execute on function public.transfer_currency_with_transaction(uuid,uuid,bigint,text,text,text,uuid) from public,anon;
revoke execute on function public.buy_market_listing_with_transaction(uuid,uuid) from public,anon;
grant execute on function public.grant_currency_with_transaction(uuid,bigint,text,text,text,text,uuid) to authenticated;
grant execute on function public.remove_currency_with_transaction(uuid,bigint,text,text,text,text,uuid) to authenticated;
grant execute on function public.transfer_currency_with_transaction(uuid,uuid,bigint,text,text,text,uuid) to authenticated;
grant execute on function public.buy_market_listing_with_transaction(uuid,uuid) to authenticated;
revoke execute on function public.buy_market_listing(uuid) from public,anon;
grant execute on function public.buy_market_listing(uuid) to authenticated;
