-- DeckVerse OS v11 — public catalog RLS hardening
-- Public readers must never execute app_private.is_admin().
-- Admin visibility is provided by separate authenticated-only SELECT policies.

drop policy if exists collections_public_read on public.collections;
drop policy if exists cards_public_read on public.cards;
drop policy if exists forms_public_read on public.card_forms;
drop policy if exists support_public_read on public.support_entries;

drop policy if exists collections_public_active_read on public.collections;
drop policy if exists collections_admin_read_all on public.collections;
drop policy if exists cards_public_active_read on public.cards;
drop policy if exists cards_admin_read_all on public.cards;
drop policy if exists forms_public_active_read on public.card_forms;
drop policy if exists forms_admin_read_all on public.card_forms;
drop policy if exists support_public_active_read on public.support_entries;
drop policy if exists support_admin_read_all on public.support_entries;

create policy collections_public_active_read
on public.collections for select to anon,authenticated
using (is_active);

create policy collections_admin_read_all
on public.collections for select to authenticated
using (app_private.is_admin());

create policy cards_public_active_read
on public.cards for select to anon,authenticated
using (
  is_active
  and exists (
    select 1 from public.collections c
    where c.id = cards.collection_id and c.is_active
  )
);

create policy cards_admin_read_all
on public.cards for select to authenticated
using (app_private.is_admin());

create policy forms_public_active_read
on public.card_forms for select to anon,authenticated
using (
  is_active
  and exists (
    select 1
    from public.cards c
    join public.collections col on col.id = c.collection_id
    where c.id = card_forms.card_id
      and c.is_active
      and col.is_active
  )
);

create policy forms_admin_read_all
on public.card_forms for select to authenticated
using (app_private.is_admin());

create policy support_public_active_read
on public.support_entries for select to anon,authenticated
using (is_active);

create policy support_admin_read_all
on public.support_entries for select to authenticated
using (app_private.is_admin());
