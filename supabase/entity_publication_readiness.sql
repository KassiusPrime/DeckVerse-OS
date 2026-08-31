-- DeckVerse OS — Entity publication readiness gate
-- Apply AFTER canonical media import/indexing and collection publication readiness.
-- Non-destructive: cards remain preserved and may be reactivated when canonical
-- artwork is imported. Existing roster rows are not deleted or rewritten.

update public.cards as card
set
  is_active = false,
  is_gacha_enabled = false,
  updated_at = now()
where card.is_active = true
  and exists (
    select 1
    from public.collections as collection
    where collection.id = card.collection_id
      and collection.is_active = true
  )
  and not exists (
    select 1
    from public.media_assets as media
    where media.card_id = card.id
      and media.entity_type in ('character', 'item', 'boss')
  );
