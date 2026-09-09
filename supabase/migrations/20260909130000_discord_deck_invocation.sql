create extension if not exists pgcrypto;

create table if not exists public.discord_decks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  cover_url text,
  invocation_code text not null unique default ('DV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  is_public boolean not null default false,
  is_invokable boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discord_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.discord_decks(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  slot_index integer not null check (slot_index between 1 and 100),
  quantity integer not null default 1 check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique (deck_id, slot_index)
);

create index if not exists discord_decks_profile_idx on public.discord_decks(profile_id, updated_at desc);
create index if not exists discord_deck_cards_deck_idx on public.discord_deck_cards(deck_id, slot_index);

alter table public.discord_decks enable row level security;
alter table public.discord_deck_cards enable row level security;

drop policy if exists discord_decks_owner_select on public.discord_decks;
drop policy if exists discord_decks_owner_insert on public.discord_decks;
drop policy if exists discord_decks_owner_update on public.discord_decks;
drop policy if exists discord_decks_owner_delete on public.discord_decks;
drop policy if exists discord_deck_cards_owner_select on public.discord_deck_cards;
drop policy if exists discord_deck_cards_owner_insert on public.discord_deck_cards;
drop policy if exists discord_deck_cards_owner_update on public.discord_deck_cards;
drop policy if exists discord_deck_cards_owner_delete on public.discord_deck_cards;

create policy discord_decks_owner_select on public.discord_decks for select to authenticated using ((select auth.uid()) = profile_id or is_public = true);
create policy discord_decks_owner_insert on public.discord_decks for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy discord_decks_owner_update on public.discord_decks for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);
create policy discord_decks_owner_delete on public.discord_decks for delete to authenticated using ((select auth.uid()) = profile_id);
create policy discord_deck_cards_owner_select on public.discord_deck_cards for select to authenticated using (exists (select 1 from public.discord_decks d where d.id = deck_id and (d.profile_id = (select auth.uid()) or d.is_public = true)));
create policy discord_deck_cards_owner_insert on public.discord_deck_cards for insert to authenticated with check (exists (select 1 from public.discord_decks d where d.id = deck_id and d.profile_id = (select auth.uid())));
create policy discord_deck_cards_owner_update on public.discord_deck_cards for update to authenticated using (exists (select 1 from public.discord_decks d where d.id = deck_id and d.profile_id = (select auth.uid()))) with check (exists (select 1 from public.discord_decks d where d.id = deck_id and d.profile_id = (select auth.uid())));
create policy discord_deck_cards_owner_delete on public.discord_deck_cards for delete to authenticated using (exists (select 1 from public.discord_decks d where d.id = deck_id and d.profile_id = (select auth.uid())));

grant select, insert, update, delete on public.discord_decks to authenticated;
grant select, insert, update, delete on public.discord_deck_cards to authenticated;

create or replace function public.bot_list_decks(p_discord_id text)
returns table(id uuid, name text, invocation_code text, description text, is_primary boolean, is_invokable boolean, card_count bigint)
language sql security definer set search_path = public as $$
  select d.id, d.name, d.invocation_code, d.description, d.is_primary, d.is_invokable,
         count(dc.id)::bigint as card_count
  from public.discord_decks d
  join public.profiles p on p.id = d.profile_id
  left join public.discord_deck_cards dc on dc.deck_id = d.id
  where p.discord_id = p_discord_id and d.is_invokable = true
  group by d.id
  order by d.is_primary desc, d.updated_at desc;
$$;

create or replace function public.bot_get_deck(p_discord_id text, p_invocation_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', d.id,
    'name', d.name,
    'description', d.description,
    'invocation_code', d.invocation_code,
    'is_primary', d.is_primary,
    'is_invokable', d.is_invokable,
    'cards', coalesce((select jsonb_agg(jsonb_build_object(
      'slot', dc.slot_index,
      'quantity', dc.quantity,
      'id', c.id,
      'name', c.name,
      'rarity', c.rarity,
      'entity_type', c.entity_type,
      'image_url', c.image_url,
      'collection', coalesce(col.name, 'DeckVerse')
    ) order by dc.slot_index)
    from public.discord_deck_cards dc
    join public.cards c on c.id = dc.card_id
    left join public.collections col on col.id = c.collection_id
    where dc.deck_id = d.id), '[]'::jsonb)
  ) into result
  from public.discord_decks d
  join public.profiles p on p.id = d.profile_id
  where p.discord_id = p_discord_id and upper(d.invocation_code) = upper(trim(p_invocation_code)) and d.is_invokable = true
  limit 1;
  if result is null then raise exception 'DECK_NOT_FOUND'; end if;
  return result;
end;
$$;

create or replace function public.bot_get_primary_deck(p_discord_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare code text;
begin
  select d.invocation_code into code
  from public.discord_decks d join public.profiles p on p.id = d.profile_id
  where p.discord_id = p_discord_id and d.is_primary = true and d.is_invokable = true
  order by d.updated_at desc limit 1;
  if code is null then raise exception 'PRIMARY_DECK_NOT_FOUND'; end if;
  return public.bot_get_deck(p_discord_id, code);
end;
$$;

revoke all on function public.bot_list_decks(text) from public, anon, authenticated;
revoke all on function public.bot_get_deck(text,text) from public, anon, authenticated;
revoke all on function public.bot_get_primary_deck(text) from public, anon, authenticated;
grant execute on function public.bot_list_decks(text) to service_role;
grant execute on function public.bot_get_deck(text,text) to service_role;
grant execute on function public.bot_get_primary_deck(text) to service_role;
