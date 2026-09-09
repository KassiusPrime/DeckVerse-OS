create table if not exists public.player_card_artwork (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  artwork_url text not null,
  artwork_source_type text not null default 'storage' check (artwork_source_type in ('storage','external')),
  artwork_storage_path text,
  artwork_original_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id),
  constraint player_card_artwork_storage_consistency check (
    (artwork_source_type = 'storage' and artwork_storage_path is not null)
    or (artwork_source_type = 'external')
  )
);

create index if not exists player_card_artwork_user_idx on public.player_card_artwork(user_id);
create index if not exists player_card_artwork_card_idx on public.player_card_artwork(card_id);

grant select, insert, update, delete on public.player_card_artwork to authenticated;
alter table public.player_card_artwork enable row level security;

create policy "player_artwork_select_own" on public.player_card_artwork
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "player_artwork_insert_owned_card" on public.player_card_artwork
  for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and exists (
        select 1 from public.rosters r
        where r.profile_id = (select auth.uid()) and r.card_id = player_card_artwork.card_id
      )
    )
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "player_artwork_update_own" on public.player_card_artwork
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  )
  with check (
    (
      user_id = (select auth.uid())
      and exists (
        select 1 from public.rosters r
        where r.profile_id = (select auth.uid()) and r.card_id = player_card_artwork.card_id
      )
    )
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

create policy "player_artwork_delete_own" on public.player_card_artwork
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-card-artwork',
  'player-card-artwork',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "player_artwork_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'player-card-artwork'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    )
  );

create policy "player_artwork_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'player-card-artwork'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.rosters r
      where r.profile_id = (select auth.uid())
        and r.card_id = (storage.foldername(name))[2]
    )
  );

create policy "player_artwork_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'player-card-artwork'
    and (
      owner_id = (select auth.uid())::text
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    )
  )
  with check (
    bucket_id = 'player-card-artwork'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.rosters r
      where r.profile_id = (select auth.uid())
        and r.card_id = (storage.foldername(name))[2]
    )
  );

create policy "player_artwork_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'player-card-artwork'
    and (
      owner_id = (select auth.uid())::text
      or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    )
  );
