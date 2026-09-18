-- Harden transaction-id idempotency under concurrent retries.
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
  if p_from<p_to then
    select deck_credits into fb from public.profiles where id=p_from for update;
    select deck_credits into tb from public.profiles where id=p_to for update;
  else
    select deck_credits into tb from public.profiles where id=p_to for update;
    select deck_credits into fb from public.profiles where id=p_from for update;
  end if;
  if fb is null or tb is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  select * into from_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=p_from limit 1;
  select * into to_existing from public.economy_transactions where transaction_id=p_transaction_id and player_id=p_to limit 1;
  if from_existing.id is not null or to_existing.id is not null then
    if from_existing.id is null or to_existing.id is null or from_existing.amount<>-p_amount or to_existing.amount<>p_amount or from_existing.transaction_type<>'TRANSFER' or to_existing.transaction_type<>'TRANSFER' or coalesce(from_existing.reference_type,'')<>coalesce(p_reference_type,'') or coalesce(from_existing.reference_id,'')<>coalesce(p_reference_id,'') then raise exception 'TRANSACTION_ID_CONFLICT'; end if;
    return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'from_balance',from_existing.balance_after,'to_balance',to_existing.balance_after,'amount',p_amount);
  end if;
  if fb<p_amount then raise exception 'INSUFFICIENT_DECK_CREDITS'; end if;
  update public.profiles set deck_credits=fb-p_amount,updated_at=now() where id=p_from;
  update public.profiles set deck_credits=tb+p_amount,updated_at=now() where id=p_to;
  insert into public.economy_transactions(transaction_id,player_id,transaction_type,amount,balance_before,balance_after,reference_type,reference_id)
  values(p_transaction_id,p_from,'TRANSFER',-p_amount,fb,fb-p_amount,p_reference_type,p_reference_id),(p_transaction_id,p_to,'TRANSFER',p_amount,tb,tb+p_amount,p_reference_type,p_reference_id);
  insert into public.economy_ledger(transaction_id,profile_id,currency,delta,balance_after,reason,source,actor_profile_id)
  values(p_transaction_id,p_from,'deck_credits',-p_amount,fb-p_amount,p_reason,'economy',actor),(p_transaction_id,p_to,'deck_credits',p_amount,tb+p_amount,p_reason,'economy',actor);
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'from_balance',fb-p_amount,'to_balance',tb+p_amount,'amount',p_amount);
end $$;

create or replace function app_private.admin_grant_card_for_transaction(p_actor uuid,p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare total integer; existing jsonb; locked_profile uuid;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_copies<1 then raise exception 'INVALID_COPIES'; end if;
  select id into locked_profile from public.profiles where id=p_profile_id for update;
  if locked_profile is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  select payload into existing from public.admin_audit_log where transaction_id=p_transaction_id and action='inventory.grant' and target_profile_id=p_profile_id limit 1;
  if existing is not null then return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'payload',existing); end if;
  if not exists(select 1 from public.cards where id=p_card_id and is_active) then raise exception 'CARD_NOT_FOUND'; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_profile_id,p_card_id,p_copies) on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now() returning copies into total;
  insert into public.admin_audit_log(transaction_id,actor_profile_id,action,target_profile_id,payload) values(p_transaction_id,p_actor,'inventory.grant',p_profile_id,jsonb_build_object('card_id',p_card_id,'copies',p_copies,'reason',p_reason,'transaction_id',p_transaction_id));
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'card_id',p_card_id,'copies',total);
end $$;

create or replace function app_private.admin_remove_card_for_transaction(p_actor uuid,p_profile_id uuid,p_card_id text,p_copies integer,p_reason text,p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare current_copies integer; next_copies integer; existing jsonb; locked_profile uuid;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  select id into locked_profile from public.profiles where id=p_profile_id for update;
  if locked_profile is null then raise exception 'PLAYER_NOT_FOUND'; end if;
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
declare current_copies integer; move_count integer:=greatest(1,p_copies); existing jsonb; from_locked uuid; to_locked uuid;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  if p_transaction_id is null then raise exception 'TRANSACTION_ID_REQUIRED'; end if;
  if p_from_profile_id=p_to_profile_id then raise exception 'SAME_PROFILE'; end if;
  if p_from_profile_id<p_to_profile_id then
    select id into from_locked from public.profiles where id=p_from_profile_id for update;
    select id into to_locked from public.profiles where id=p_to_profile_id for update;
  else
    select id into to_locked from public.profiles where id=p_to_profile_id for update;
    select id into from_locked from public.profiles where id=p_from_profile_id for update;
  end if;
  if from_locked is null or to_locked is null then raise exception 'PLAYER_NOT_FOUND'; end if;
  select payload into existing from public.admin_audit_log where transaction_id=p_transaction_id and action='inventory.transfer' and target_profile_id=p_to_profile_id limit 1;
  if existing is not null then return jsonb_build_object('success',true,'idempotent',true,'transaction_id',p_transaction_id,'payload',existing); end if;
  select copies into current_copies from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id for update;
  if current_copies is null or current_copies<move_count then raise exception 'INSUFFICIENT_COPIES'; end if;
  if current_copies=move_count then delete from public.rosters where profile_id=p_from_profile_id and card_id=p_card_id; else update public.rosters set copies=copies-move_count,updated_at=now() where profile_id=p_from_profile_id and card_id=p_card_id; end if;
  insert into public.rosters(profile_id,card_id,copies) values(p_to_profile_id,p_card_id,move_count) on conflict(profile_id,card_id) do update set copies=public.rosters.copies+excluded.copies,updated_at=now();
  insert into public.admin_audit_log(transaction_id,actor_profile_id,action,target_profile_id,payload) values(p_transaction_id,p_actor,'inventory.transfer',p_to_profile_id,jsonb_build_object('from',p_from_profile_id,'card_id',p_card_id,'copies',move_count,'reason',p_reason,'transaction_id',p_transaction_id));
  return jsonb_build_object('success',true,'idempotent',false,'transaction_id',p_transaction_id,'card_id',p_card_id,'copies',move_count);
end $$;