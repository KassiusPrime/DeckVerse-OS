import { getSupabaseBrowserClient } from '../../services/supabase/client.js';

export const PackRepository = Object.freeze({
  async getConfig() {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('game_settings')
      .select('key,value')
      .eq('key','gacha_config')
      .maybeSingle();
    if (error) throw error;
    return data?.value || {};
  },

  async open(transactionId, count) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('open_gacha_pack', {
      p_transaction_id: transactionId,
      p_count: count,
    });
    if (error) throw error;
    return data;
  },
});

export default PackRepository;
