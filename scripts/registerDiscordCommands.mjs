import { DISCORD_COMMANDS as commands } from '../lib/discordCommands.js';

const appId = process.env.DISCORD_APPLICATION_ID || process.env.CLIENT_ID || '1543823857293594714';
const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_TOKEN.');
  process.exit(1);
}

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

console.log(`Sincronizando ${commands.length} comandos DeckVerse com o Discord (${guildId ? 'guild' : 'global'})...`);
const response = await fetch(endpoint, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
const body = await response.text();
if (!response.ok) {
  console.error(`Discord command registration failed (${response.status}): ${body}`);
  process.exit(1);
}
console.log(`✅ ${commands.length} comandos registrados com sucesso ${guildId ? `na guild ${guildId}` : 'globalmente'}.`);
