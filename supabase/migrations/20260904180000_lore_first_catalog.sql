-- DeckVerse OS — lore-first catalog refactor
-- Removes combat-stat attributes from collectible entities and introduces bounded editorial synopses.
-- Keep this migration in source control and apply it to the linked Supabase project.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Short editorial synopsis used by public card/collection surfaces.
alter table public.collections add column if not exists synopsis text;
alter table public.cards add column if not exists synopsis text;
alter table public.card_forms add column if not exists synopsis text;

-- Temporary compatibility backfill. These rows remain identifiable for editorial rewriting;
-- application validation will not pretend that copied legacy descriptions are final curated copy.
update public.collections
set synopsis = nullif(trim(description), '')
where synopsis is null and nullif(trim(description), '') is not null;

update public.cards
set synopsis = nullif(trim(description), '')
where synopsis is null and nullif(trim(description), '') is not null;

update public.card_forms
set synopsis = nullif(trim(description), '')
where synopsis is null and nullif(trim(description), '') is not null;

-- Retire the stat-derived player metric before removing its dependencies.
drop trigger if exists deckverse_roster_pwr_refresh on public.rosters;
drop function if exists public.set_equipped_card(text, boolean);
drop function if exists app_private.roster_pwr_trigger();
drop function if exists app_private.recalculate_pwr(uuid);

-- Combat statistics are no longer part of collectible entities.
alter table public.cards
  drop column if exists atk,
  drop column if exists def,
  drop column if exists mag,
  drop column if exists speed,
  drop column if exists hp;

-- PWR was entirely derived from retired card statistics.
alter table public.profiles drop column if exists pwr;

-- Remove old stat-weight configuration while preserving economy/gacha/progression settings.
update public.game_settings
set value = value - 'pwr_weights' - 'collection_complete_bonus', updated_at = now()
where key = 'progression_config' and jsonb_typeof(value) = 'object';

-- Synopsis constraints. Existing copied legacy descriptions can be outside the editorial target,
-- so constraints are NOT VALID first; the editorial rewrite script validates every active row
-- before these checks are promoted. This avoids breaking production during the content pass.
alter table public.collections drop constraint if exists collections_synopsis_length_ck;
alter table public.collections add constraint collections_synopsis_length_ck
  check (synopsis is null or char_length(synopsis) between 350 and 400) not valid;

alter table public.cards drop constraint if exists cards_synopsis_length_ck;
alter table public.cards add constraint cards_synopsis_length_ck
  check (
    synopsis is null or
    (entity_type = 'character' and char_length(synopsis) between 220 and 260) or
    (entity_type = 'boss' and char_length(synopsis) between 250 and 300) or
    (entity_type = 'item' and char_length(synopsis) between 200 and 240)
  ) not valid;

alter table public.card_forms drop constraint if exists card_forms_synopsis_length_ck;
alter table public.card_forms add constraint card_forms_synopsis_length_ck
  check (synopsis is null or char_length(synopsis) between 180 and 220) not valid;

comment on column public.collections.synopsis is 'Editorial collection synopsis, target 350–400 characters.';
comment on column public.cards.synopsis is 'Editorial collectible synopsis: character 220–260, boss 250–300, item 200–240 characters.';
comment on column public.card_forms.synopsis is 'Editorial transformation/form synopsis, target 180–220 characters.';

commit;
