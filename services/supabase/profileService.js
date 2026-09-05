import { getSupabaseBrowserClient } from './client.js';

export async function getMyProfile() {
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, discord_id, discord_username, display_name, avatar_url, role, astral_shards, ether_cores, deck_credits, level, xp, cosmic_luck, pity_counter, created_at, updated_at')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDisplayName(displayName) {
  const value = String(displayName || '').trim();
  if (value.length < 2 || value.length > 32) throw new Error('DISPLAY_NAME_LENGTH');
  const supabase = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user) throw new Error('AUTH_REQUIRED');

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: value, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)
    .select('id, display_name, role, discord_id, discord_username, avatar_url, astral_shards, ether_cores, deck_credits, level, xp, cosmic_luck, pity_counter')
    .single();
  if (error) throw error;
  return data;
}

export default { getMyProfile, updateDisplayName };
