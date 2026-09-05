import { getSupabaseBrowserClient } from './client.js';

async function rpc(name, params = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

export function getMetaGameState() {
  return rpc('get_my_metagame_state');
}

export function setCollectionDisabled(collectionId, disabled = true) {
  return rpc('set_collection_disabled', { p_collection_id: collectionId, p_disabled: Boolean(disabled) });
}

export function setCardWish(cardId, wished = true) {
  return rpc('set_card_wish', { p_card_id: cardId, p_wished: Boolean(wished) });
}

export function setCardPin(cardId, pinned = true) {
  return rpc('set_card_pin', { p_card_id: cardId, p_pinned: Boolean(pinned) });
}

export function advanceTutorial(step) {
  return rpc('advance_tutorial', { p_step: Math.max(0, Math.floor(Number(step) || 0)) });
}

export function claimDaily() {
  return rpc('claim_daily');
}

export function claimDailyCurrency() {
  return rpc('claim_daily_currency');
}

export function buyTowerLevel() {
  return rpc('buy_tower_level');
}

export function buyBadgeLevel() {
  return rpc('buy_badge_level');
}

export function claimChallenge(challengeKey) {
  return rpc('claim_challenge', { p_challenge_key: challengeKey });
}

export async function getCardEconomy(cardId) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('get_card_economy', { p_card_id: cardId });
  if (error) throw error;
  return data;
}

export async function getCardValueConfig() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from('game_settings').select('value, updated_at').eq('key', 'card_value_config').single();
  if (error) throw error;
  return data;
}

export async function adminSetCardValueConfig(config) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('game_settings')
    .update({ value: config, updated_at: new Date().toISOString() })
    .eq('key', 'card_value_config')
    .select('value, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export default {
  getMetaGameState,
  setCollectionDisabled,
  setCardWish,
  setCardPin,
  advanceTutorial,
  claimDaily,
  claimDailyCurrency,
  buyTowerLevel,
  buyBadgeLevel,
  claimChallenge,
  getCardEconomy,
  getCardValueConfig,
  adminSetCardValueConfig,
};
