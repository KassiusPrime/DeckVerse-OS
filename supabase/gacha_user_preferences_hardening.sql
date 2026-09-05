-- Hardening complementar para Disablelist/Wishlist.
-- A UI usa somente RPCs autenticados. Bloqueamos escrita direta nas tabelas
-- para impedir bypass das validações de pool e manter as invariantes do Gacha.

revoke all on table public.gacha_collection_preferences from anon;
revoke all on table public.gacha_collection_preferences from authenticated;
revoke all on table public.gacha_card_wishes from anon;
revoke all on table public.gacha_card_wishes from authenticated;

-- Mantemos RLS habilitado como defesa em profundidade, mesmo sem grants diretos.
alter table public.gacha_collection_preferences enable row level security;
alter table public.gacha_card_wishes enable row level security;

-- Recria SELECT policies com helpers avaliados uma vez por statement.
drop policy if exists gacha_collection_preferences_self_or_admin_select on public.gacha_collection_preferences;
create policy gacha_collection_preferences_self_or_admin_select
on public.gacha_collection_preferences
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select app_private.is_admin())
);

drop policy if exists gacha_card_wishes_self_or_admin_select on public.gacha_card_wishes;
create policy gacha_card_wishes_self_or_admin_select
on public.gacha_card_wishes
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select app_private.is_admin())
);

-- RPCs continuam sendo a única superfície de escrita do cliente.
revoke all on function public.get_my_gacha_preferences() from public, anon;
revoke all on function public.set_collection_gacha_preference(text, boolean, boolean) from public, anon;
revoke all on function public.set_card_wish(text, boolean) from public, anon;
revoke all on function public.clear_gacha_disablelist() from public, anon;

grant execute on function public.get_my_gacha_preferences() to authenticated;
grant execute on function public.set_collection_gacha_preference(text, boolean, boolean) to authenticated;
grant execute on function public.set_card_wish(text, boolean) to authenticated;
grant execute on function public.clear_gacha_disablelist() to authenticated;
