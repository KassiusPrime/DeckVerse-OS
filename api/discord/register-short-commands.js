import crypto from 'node:crypto';

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

const tradeIdOption = { type: 3, name: 'id', description: 'ID da troca', required: true };

const commands = [
  {
    name: 'r', description: 'Rola cartas', options: [
      { type: 4, name: 'q', description: 'Quantidade dentro do seu limite atual', required: false, min_value: 1, max_value: 100 },
      { type: 3, name: 'm', description: 'Moeda', required: false, choices: [
        { name: 'Astral', value: 'astral' },
        { name: 'Éter', value: 'ether' },
        { name: 'Roll gratuito', value: 'gratis' },
      ] },
    ],
  },
  { name: 'c', description: 'Pega uma carta do spawn', options: [{ type: 4, name: 'n', description: 'Número da carta', required: false, min_value: 1, max_value: 100 }] },
  { name: 'i', description: 'Mostra seu acervo e os IDs das cartas' },
  { name: 'p', description: 'Mostra perfil, moedas, sorte e limite de giros' },
  {
    name: 'prog', description: 'Vê ou redistribui seus pontos de nível', options: [
      { type: 4, name: 'limite', description: 'Pontos destinados ao limite (+1 por ponto)', required: false, min_value: 0, max_value: 1000 },
      { type: 4, name: 'sorte', description: 'Pontos destinados à Sorte Cósmica', required: false, min_value: 0, max_value: 1000 },
    ],
  },
  { name: 'unlock', description: 'Compra um Expansor de Giros permanente de +10' },
  {
    name: 'v', description: 'Vende carta ao sistema por Deck Credits', options: [
      { type: 3, name: 'card', description: 'ID da carta (veja em /i)', required: true },
      { type: 4, name: 'q', description: 'Quantidade', required: false, min_value: 1, max_value: 999 },
    ],
  },
  {
    name: 't', description: 'Trocas P2P seguras entre jogadores', options: [
      { type: 1, name: 'list', description: 'Lista suas trocas recentes' },
      { type: 1, name: 'new', description: 'Abre uma troca com outro jogador', options: [{ type: 6, name: 'user', description: 'Jogador do Discord', required: true }] },
      { type: 1, name: 'offer', description: 'Define sua oferta na troca', options: [
        tradeIdOption,
        { type: 3, name: 'card', description: 'ID de uma carta; deixe vazio para só DC', required: false },
        { type: 4, name: 'q', description: 'Quantidade da carta', required: false, min_value: 1, max_value: 999 },
        { type: 4, name: 'dc', description: 'Deck Credits oferecidos', required: false, min_value: 0, max_value: 2000000000 },
      ] },
      { type: 1, name: 'confirm', description: 'Confirma que sua oferta está correta', options: [tradeIdOption] },
      { type: 1, name: 'accept', description: 'Aceita definitivamente uma troca pronta', options: [tradeIdOption] },
      { type: 1, name: 'cancel', description: 'Cancela uma troca', options: [tradeIdOption] },
      { type: 1, name: 'reject', description: 'Recusa uma troca recebida', options: [tradeIdOption] },
    ],
  },
  { name: 'h', description: 'Ajuda rápida' },
  {
    name: 's', description: 'Configura o spawn automático', options: [
      { type: 1, name: 'ch', description: 'Define o canal do spawn', options: [{ type: 7, name: 'c', description: 'Canal', required: true }] },
      { type: 1, name: 'on', description: 'Liga o spawn automático' },
      { type: 1, name: 'off', description: 'Desliga o spawn automático' },
      { type: 1, name: 't', description: 'Define o intervalo', options: [{ type: 4, name: 'm', description: 'Minutos', required: true, min_value: 5, max_value: 1440 }] },
      { type: 1, name: 'max', description: 'Máximo por rodada', options: [{ type: 4, name: 'n', description: 'Máximo', required: true, min_value: 1, max_value: 100 }] },
      { type: 1, name: 'now', description: 'Agenda spawn para o próximo ciclo' },
    ],
  },
];

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
