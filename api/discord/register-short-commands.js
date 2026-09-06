import crypto from 'node:crypto';
import { DISCORD_COMMANDS as commands } from '../../lib/discordCommands.js';

const APP_ID = process.env.DISCORD_APPLICATION_ID || process.env.CLIENT_ID || '1543823857293594714';
const TOKEN_HASH = '55b0cc20576e06b8238c582e550e2eb0dad529633752da319df40dbc8612b1ac';

function authorized(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return false;
  const token = header.slice(7).trim();
  if (!token) return false;
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const a = Buffer.from(digest, 'hex');
    const b = Buffer.from(TOKEN_HASH, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  if (!botToken) return res.status(500).json({ ok: false, error: 'DISCORD_BOT_TOKEN_MISSING' });
  const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
  const endpoint = guildId
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  const discordResponse = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  const body = await discordResponse.json().catch(() => null);
  if (!discordResponse.ok) return res.status(502).json({ ok: false, discord_status: discordResponse.status, error: body?.message || 'DISCORD_REGISTRATION_FAILED' });
  return res.status(200).json({ ok: true, scope: guildId ? 'guild' : 'global', count: Array.isArray(body) ? body.length : commands.length, commands: commands.map((c) => c.name) });
}
