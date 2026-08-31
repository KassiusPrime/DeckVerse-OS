const appId = process.env.DISCORD_APPLICATION_ID || process.env.CLIENT_ID || '1543823857293594714';
const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_TOKEN.');
  process.exit(1);
}

const commands = [
  { name: 'roll', description: 'Executa uma invocação no DeckVerse', options: [{ type: 3, name: 'moeda', description: 'Moeda usada no giro', required: false, choices: [{ name: 'Fragmentos Astrais', value: 'astral' }, { name: 'Núcleos de Éter', value: 'ether' }] }] },
  { name: 'rolls', description: 'Executa invocações em lote', options: [{ type: 4, name: 'quantidade', description: 'Quantidade de giros', required: true, min_value: 1, max_value: 50 }, { type: 3, name: 'moeda', description: 'Moeda usada nos giros', required: false, choices: [{ name: 'Fragmentos Astrais', value: 'astral' }, { name: 'Núcleos de Éter', value: 'ether' }] }] },
  { name: 'inventory', description: 'Mostra seu acervo com paginação' },
  { name: 'profile', description: 'Mostra nível, PWR, moedas e Sorte Cósmica' },
  { name: 'support', description: 'Mostra os principais comandos e regras' },
];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

console.log(`Sincronizando ${commands.length} comandos com o Discord (${guildId ? 'guild' : 'global'})...`);
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
