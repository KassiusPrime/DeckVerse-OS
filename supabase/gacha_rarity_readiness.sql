-- DeckVerse OS — Gacha rarity readiness gate
-- Non-destructive: cards with legacy/unreviewed rarity values remain published,
-- but cannot enter the random pool until curated into the official scale.

update public.cards as card
set
  is_gacha_enabled = false,
  updated_at = now()
where card.is_active = true
  and card.is_gacha_enabled = true
  and exists (
    select 1
    from public.collections as collection
    where collection.id = card.collection_id
      and collection.is_active = true
  )
  and coalesce(upper(trim(card.rarity)), '') not in ('R', 'SR', 'SSR', 'UR', 'LR', 'MR');
