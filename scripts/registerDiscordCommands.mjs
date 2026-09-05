const appId = process.env.DISCORD_APPLICATION_ID || process.env.CLIENT_ID || '1543823857293594714';
const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || '';
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_TOKEN.');
  process.exit(1);
}

const commands = [
  {
    name: 'r',
    description: 'Rola cartas',
    options: [
      { type: 4, name: 'q', description: 'Quantidade (1-50)', required: false, min_value: 1, max_value: 50 },
      {
        type: 3,
        name: 'm',
        description: 'Moeda',
        required: false,
        choices: [
          { name: 'Astral', value: 'astral' },
          { name: 'Éter', value: 'ether' },
        ],
      },
    ],
  },
  { name: 'c', description: 'Pega uma carta do spawn', options: [{ type: 4, name: 'n', description: 'Número da carta', required: false, min_value: 1, max_value: 100 }] },
  { name: 'i', description: 'Mostra seu acervo' },
  { name: 'p', description: 'Mostra seu perfil' },
  { name: 'h', description: 'Ajuda rápida' },
  {
    name: 's',
    description: 'Configura o spawn automático',
    options: [
      {
        type: 1,
        name: 'ch',
        description: 'Define o canal do spawn',
        options: [{ type: 7, name: 'c', description: 'Canal', required: true }],
      },
      { type: 1, name: 'on', description: 'Liga o spawn automático' },
      { type: 1, name: 'off', description: 'Desliga o spawn automático' },
      {
        type: 1,
        name: 't',
        description: 'Define o intervalo em minutos',
        options: [{ type: 4, name: 'm', description: 'Minutos', required: true, min_value: 5, max_value: 1440 }],
      },
      {
        type: 1,
        name: 'max',
        description: 'Máximo de cartas por rodada',
        options: [{ type: 4, name: 'n', description: 'Máximo', required: true, min_value: 1, max_value: 100 }],
      },
      { type: 1, name: 'now', description: 'Agenda um spawn para o próximo ciclo' },
    ],
  },
];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

console.log(`Sincronizando ${commands.length} comandos curtos com o Discord (${guildId ? 'guild' : 'global'})...`);
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
console.log(`✅ ${commands.length} comandos curtos registrados com sucesso ${guildId ? `na guild ${guildId}` : 'globalmente'}.`);
