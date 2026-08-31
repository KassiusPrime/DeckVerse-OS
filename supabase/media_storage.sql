-- DeckVerse v11 — media/storage extension. Apply after supabase/bootstrap.sql.
-- Internal slugs and media metadata never need to be exposed in public UI.

alter table public.cards add column if not exists slug text;
alter table public.card_forms add column if not exists slug text;
create index if not exists cards_collection_type_slug_idx on public.cards(collection_id, entity_type, slug);
create index if not exists card_forms_card_slug_idx on public.card_forms(card_id, slug);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  collection_id text references public.collections(id) on update cascade on delete restrict,
  card_id text references public.cards(id) on update cascade on delete set null,
  form_id text references public.card_forms(id) on update cascade on delete set null,
  entity_type text not null,
  storage_path text not null unique,
  original_filename text not null,
  sha256 text not null,
  mime_type text,
  byte_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_card_idx on public.media_assets(card_id);
create index if not exists media_assets_form_idx on public.media_assets(form_id);
create unique index if not exists media_assets_sha_path_uidx on public.media_assets(sha256, storage_path);

alter table public.media_assets enable row level security;
drop policy if exists media_assets_admin_read on public.media_assets;
drop policy if exists media_assets_admin_write on public.media_assets;
create policy media_assets_admin_read on public.media_assets for select to authenticated using (app_private.is_admin());
create policy media_assets_admin_write on public.media_assets for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
grant select, insert, update, delete on public.media_assets to authenticated;

-- Public artwork bucket. Public downloads are intentional; writes remain admin-only.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('cards', 'cards', true, 26214400, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists deckverse_cards_admin_insert on storage.objects;
drop policy if exists deckverse_cards_admin_update on storage.objects;
drop policy if exists deckverse_cards_admin_delete on storage.objects;
drop policy if exists deckverse_cards_admin_select on storage.objects;

create policy deckverse_cards_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'cards' and app_private.is_admin());

create policy deckverse_cards_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'cards' and app_private.is_admin())
with check (bucket_id = 'cards' and app_private.is_admin());

create policy deckverse_cards_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'cards' and app_private.is_admin());

create policy deckverse_cards_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'cards' and app_private.is_admin());
