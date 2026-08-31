-- DeckVerse OS — Publication readiness gate
-- Apply AFTER canonical media import/indexing.
-- Non-destructive: planned collections remain in the database and can be
-- reactivated later when their canonical media package is imported.

update public.collections as collection
set
  is_active = false,
  updated_at = now()
where collection.is_active = true
  and not exists (
    select 1
    from public.media_assets as media
    where media.collection_id = collection.id
  );

-- Intentionally do not delete or rewrite child cards. Public catalog queries and
-- gacha require an active parent collection, so planned data stays preserved.
