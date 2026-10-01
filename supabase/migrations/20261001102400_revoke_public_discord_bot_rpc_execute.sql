-- PUBLIC inherits EXECUTE on functions by default; remove it from Discord-only SECURITY DEFINER wrappers.
revoke execute on function public.bot_accept_trade(text, uuid) from public;
revoke execute on function public.bot_buy_roll_limit_unlock(text) from public;
revoke execute on function public.bot_claim_spawn_card(uuid, text) from public;
revoke execute on function public.bot_close_trade(text, uuid, text) from public;
revoke execute on function public.bot_confirm_trade(text, uuid) from public;
revoke execute on function public.bot_create_spawn_wave(text) from public;
revoke execute on function public.bot_create_trade(text, text) from public;
revoke execute on function public.bot_get_roll_progression(text) from public;
revoke execute on function public.bot_sell_card(text, text, integer) from public;
revoke execute on function public.bot_set_level_progression(text, integer, integer) from public;
revoke execute on function public.bot_set_trade_offer(text, uuid, text, integer, bigint) from public;
revoke execute on function public.bot_touch_guild_player(text, text) from public;
