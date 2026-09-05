import { createClient } from '@supabase/supabase-js';
import { createSpawnWave, dueGuildSettings, sendSpawnWave } from '../../services/discord/spawnService.js';

export const config = { maxDuration: 60 };
const DEFAULT_SUPABASE_URL = 'https://rrujnjraonckjdtpsfol.supabase.co';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVER_CONFIG_MISSING');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.authorization === `Bearer ${secret}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'DISCORD_BOT_TOKEN_MISSING' });

  const supabase = adminClient();
  const settings = await dueGuildSettings(supabase);
  const results = [];

  for (const setting of settings) {
    let wave = null;
    try {
      wave = await createSpawnWave(supabase, setting.guild_id);
      if (!wave?.card_count) {
        results.push({ guild_id: setting.guild_id, ok: true, card_count: 0, reason: 'NO_LINKED_PLAYERS' });
        continue;
      }
      const sent = await sendSpawnWave(wave, token);
      results.push({ guild_id: setting.guild_id, ok: true, card_count: wave.card_count, sent_messages: sent.sentMessages, wave_id: wave.wave_id });
    } catch (error) {
      if (wave?.wave_id) {
        await supabase.from('discord_spawn_waves').update({ status: 'expired', closed_at: new Date().toISOString() }).eq('id', wave.wave_id);
      }
      await supabase
        .from('discord_guild_settings')
        .update({ next_spawn_at: new Date(Date.now() + 5 * 60_000).toISOString(), updated_at: new Date().toISOString() })
        .eq('guild_id', setting.guild_id);
      results.push({ guild_id: setting.guild_id, ok: false, error: String(error?.message || error).slice(0, 300) });
    }
  }

  return res.status(200).json({ ok: true, processed: settings.length, results });
}
