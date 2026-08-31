import { createClient } from '@supabase/supabase-js';

const COMMANDS = [
  { name: 'roll', description: 'Executa uma invocação no DeckVerse', options: [{ type: 3, name: 'moeda', description: 'Moeda usada no giro', required: false, choices: [{ name: 'Fragmentos Astrais', value: 'astral' }, { name: 'Núcleos de Éter', value: 'ether' }] }] },
  { name: 'rolls', description: 'Executa invocações em lote', options: [{ type: 4, name: 'quantidade', description: 'Quantidade de giros', required: true, min_value: 1, max_value: 50 }, { type: 3, name: 'moeda', description: 'Moeda usada nos giros', required: false, choices: [{ name: 'Fragmentos Astrais', value: 'astral' }, { name: 'Núcleos de Éter', value: 'ether' }] }] },
  { name: 'inventory', description: 'Mostra seu acervo com paginação' },
  { name: 'profile', description: 'Mostra nível, PWR, moedas e Sorte Cósmica' },
  { name: 'support', description: 'Mostra os principais comandos e regras' },
];

const MARKER_KEY = 'discord_commands_v11_registration';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });

  const appId = process.env.DISCORD_APPLICATION_ID || process.env.CLIENT_ID || '1543823857293594714';
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!token) missing.push('DISCORD_BOT_TOKEN/DISCORD_TOKEN');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) return send(res, 500, { error: 'SERVER_ENV_MISSING', missing });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: marker, error: markerError } = await supabase.from('game_settings').select('value').eq('key', MARKER_KEY).maybeSingle();
  if (markerError) return send(res, 500, { error: 'MARKER_READ_FAILED' });
  if (marker?.value?.registered === true) {
    return send(res, 200, { ok: true, alreadyRegistered: true, count: marker.value.count || COMMANDS.length, scope: marker.value.scope || 'global', applicationId: appId });
  }

  const endpoint = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  const discordResponse = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(COMMANDS),
  });
  const discordBody = await discordResponse.text();
  if (!discordResponse.ok) {
    console.error('[DeckVerse register commands]', discordResponse.status, discordBody.slice(0, 500));
    return send(res, 502, { error: 'DISCORD_REGISTRATION_FAILED', status: discordResponse.status });
  }

  let registered = [];
  try { registered = JSON.parse(discordBody); } catch { registered = []; }
  const value = {
    registered: true,
    count: Array.isArray(registered) ? registered.length : COMMANDS.length,
    scope: guildId ? 'guild' : 'global',
    guild_id: guildId || null,
    application_id: appId,
    registered_at: new Date().toISOString(),
  };
  const { error: writeError } = await supabase.from('game_settings').upsert({ key: MARKER_KEY, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (writeError) return send(res, 500, { error: 'REGISTERED_BUT_MARKER_WRITE_FAILED', count: value.count, scope: value.scope, applicationId: appId });

  return send(res, 200, { ok: true, alreadyRegistered: false, count: value.count, scope: value.scope, applicationId: appId });
}
