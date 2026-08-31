import { getSupabaseBrowserClient } from './client.js';

export async function getGameSettings() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('game_settings')
    .select('key, value, updated_at')
    .in('key', ['gacha_config', 'economy_config', 'progression_config', 'support_config']);
  if (error) throw error;
  return Object.fromEntries((data || []).map((row) => [row.key, row.value]));
}

export async function rollGacha(count = 1, currency = 'astral_shards') {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('roll_gacha', {
    p_count: Math.max(1, Math.floor(Number(count) || 1)),
    p_currency: currency,
  });
  if (error) throw error;
  return data;
}

export async function getMyRoster() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('rosters')
    .select('id, card_id, copies, is_equipped, acquired_at, cards(name, rarity, entity_type, image_url, collection_id, atk, def, mag, speed, hp)')
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setEquipped(cardId, isEquipped) {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) throw new Error('AUTH_REQUIRED');
  const { error } = await supabase
    .from('rosters')
    .update({ is_equipped: Boolean(isEquipped) })
    .eq('profile_id', authData.user.id)
    .eq('card_id', cardId);
  if (error) throw error;
}

export async function adminAdjustBalance(profileId, currency, amount, reason) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc('admin_adjust_balance', {
    p_profile_id: profileId,
    p_currency: currency,
    p_amount: Math.trunc(Number(amount) || 0),
    p_reason: String(reason || '').trim() || 'Ajuste administrativo',
  });
  if (error) throw error;
  return data;
}

export async function adminSetGachaConfig(config) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('game_settings')
    .update({ value: config, updated_at: new Date().toISOString() })
    .eq('key', 'gacha_config')
    .select('key, value, updated_at')
    .single();
  if (error) throw error;
  return data;
}

export default { getGameSettings, rollGacha, getMyRoster, setEquipped, adminAdjustBalance, adminSetGachaConfig };
