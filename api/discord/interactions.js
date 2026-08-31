import { createClient } from '@supabase/supabase-js';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

const PAGE_SIZE = 5;

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVER_CONFIG_MISSING');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function response(res, body, status = 200) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

function message(content, embeds = [], components = [], ephemeral = false) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, embeds, components, ...(ephemeral ? { flags: 64 } : {}) },
  };
}

async function getProfileByDiscord(supabase, discordId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, discord_id, discord_username, display_name, avatar_url, astral_shards, ether_cores, level, pwr, cosmic_luck, pity_counter')
    .eq('discord_id', discordId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function inventoryPage(supabase, discordId, page = 0) {
  const profile = await getProfileByDiscord(supabase, discordId);
  if (!profile) return { missing: true };
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await supabase
    .from('rosters')
    .select('copies, is_equipped, cards(name, rarity, entity_type, image_url, collections(name))', { count: 'exact' })
    .eq('profile_id', profile.id)
    .order('acquired_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return { profile, rows: data || [], page: safePage, totalPages, count: count || 0 };
}

function inventoryEmbed(result) {
  const fields = result.rows.map((row) => ({
    name: `${row.cards?.rarity || 'R'} · ${row.cards?.name || 'Entidade'}`,
    value: `${row.cards?.collections?.name || 'DeckVerse'} · ${row.copies}x${row.is_equipped ? ' · Equipado' : ''}`,
    inline: false,
  }));
  return {
    title: `Acervo de ${result.profile.display_name || result.profile.discord_username || 'Jogador'}`,
    description: result.count ? `${result.count} entidades únicas · página ${result.page + 1}/${result.totalPages}` : 'Este acervo ainda está vazio.',
    fields,
    thumbnail: result.profile.avatar_url ? { url: result.profile.avatar_url } : undefined,
    color: 0x7c5cff,
  };
}

function paginator(discordId, page, totalPages) {
  return [{
    type: 1,
    components: [
      { type: 2, style: 2, label: '◀️', custom_id: `inventory:${discordId}:${Math.max(0, page - 1)}`, disabled: page <= 0 },
      { type: 2, style: 2, label: '▶️', custom_id: `inventory:${discordId}:${Math.min(totalPages - 1, page + 1)}`, disabled: page >= totalPages - 1 },
    ],
  }];
}

async function handleCommand(interaction, supabase) {
  const name = interaction.data?.name;
  const discordId = interaction.member?.user?.id || interaction.user?.id;
  if (!discordId) return message('Não consegui identificar sua conta do Discord.', [], [], true);

  if (name === 'profile') {
    const profile = await getProfileByDiscord(supabase, discordId);
    if (!profile) return message('Sua conta ainda não foi vinculada. Entre no site do DeckVerse com Discord primeiro.', [], [], true);
    return message('', [{
      title: profile.display_name || profile.discord_username || 'Perfil DeckVerse',
      thumbnail: profile.avatar_url ? { url: profile.avatar_url } : undefined,
      color: 0x7c5cff,
      fields: [
        { name: 'Nível', value: String(profile.level), inline: true },
        { name: 'PWR', value: String(profile.pwr), inline: true },
        { name: 'Sorte Cósmica', value: `${Number(profile.cosmic_luck || 1).toFixed(2)}x`, inline: true },
        { name: 'Fragmentos Astrais', value: String(profile.astral_shards), inline: true },
        { name: 'Núcleos de Éter', value: String(profile.ether_cores), inline: true },
        { name: 'Pity', value: String(profile.pity_counter), inline: true },
      ],
    }]);
  }

  if (name === 'inventory') {
    const result = await inventoryPage(supabase, discordId, 0);
    if (result.missing) return message('Sua conta ainda não foi vinculada. Entre no DeckVerse com Discord primeiro.', [], [], true);
    return message('', [inventoryEmbed(result)], paginator(discordId, result.page, result.totalPages), true);
  }

  if (name === 'roll' || name === 'rolls') {
    const countOption = interaction.data?.options?.find((option) => option.name === 'quantidade');
    const currencyOption = interaction.data?.options?.find((option) => option.name === 'moeda');
    const count = name === 'roll' ? 1 : Math.max(1, Number(countOption?.value || 10));
    const currency = currencyOption?.value === 'ether' ? 'ether_cores' : 'astral_shards';
    const { data, error } = await supabase.rpc('bot_roll_gacha', { p_discord_id: discordId, p_count: count, p_currency: currency });
    if (error) {
      const known = error.message?.includes('DISCORD_PROFILE_NOT_FOUND') ? 'Entre no site com Discord antes de usar o bot.'
        : error.message?.includes('INSUFFICIENT_BALANCE') ? 'Saldo insuficiente para este giro.'
        : error.message?.includes('ROLL_COUNT_EXCEEDS_LEVEL_LIMIT') ? 'Esse lote excede o limite do seu nível.'
        : 'Não foi possível concluir o giro.';
      return message(known, [], [], true);
    }
    const pulls = Array.isArray(data?.pulls) ? data.pulls : [];
    const preview = pulls.slice(0, 10).map((pull) => `**${pull.rarity}** · ${pull.name}`).join('\n');
    const top = [...pulls].sort((a, b) => ['R','SR','SSR','UR','LR','MR'].indexOf(b.rarity) - ['R','SR','SSR','UR','LR','MR'].indexOf(a.rarity))[0];
    return message('', [{
      title: count === 1 ? 'Invocação concluída' : `${count} invocações concluídas`,
      description: `${preview}${pulls.length > 10 ? `\n…e mais ${pulls.length - 10}` : ''}`,
      image: top?.image_url ? { url: top.image_url } : undefined,
      color: 0x7c5cff,
      footer: { text: `Pity ${data.pity_before} → ${data.pity_after} · custo ${data.cost}` },
    }]);
  }

  if (name === 'support') return message('Comandos: `/roll`, `/rolls`, `/inventory`, `/profile`. Regras completas: abra a página **Suporte** no DeckVerse.', [], [], true);
  return message('Comando não reconhecido.', [], [], true);
}

async function handleComponent(interaction, supabase) {
  const customId = interaction.data?.custom_id || '';
  if (!customId.startsWith('inventory:')) return message('Ação expirada.', [], [], true);
  const [, ownerDiscordId, pageRaw] = customId.split(':');
  const clicker = interaction.member?.user?.id || interaction.user?.id;
  if (clicker !== ownerDiscordId) return message('Este inventário pertence a outra pessoa.', [], [], true);
  const result = await inventoryPage(supabase, ownerDiscordId, Number(pageRaw || 0));
  if (result.missing) return message('Perfil não encontrado.', [], [], true);
  return {
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: { embeds: [inventoryEmbed(result)], components: paginator(ownerDiscordId, result.page, result.totalPages) },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return response(res, { error: 'Method not allowed' }, 405);
  const rawBody = await readRawBody(req);
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp || !(await verifyKey(rawBody, signature, timestamp, publicKey))) return response(res, { error: 'Invalid request signature' }, 401);

  let interaction;
  try { interaction = JSON.parse(rawBody.toString('utf8')); }
  catch { return response(res, { error: 'Invalid JSON' }, 400); }

  if (interaction.type === InteractionType.PING) return response(res, { type: InteractionResponseType.PONG });

  try {
    const supabase = adminClient();
    const body = interaction.type === InteractionType.APPLICATION_COMMAND
      ? await handleCommand(interaction, supabase)
      : interaction.type === InteractionType.MESSAGE_COMPONENT
        ? await handleComponent(interaction, supabase)
        : message('Interação não suportada.', [], [], true);
    return response(res, body);
  } catch (error) {
    console.error('[DeckVerse Discord]', error?.message || error);
    return response(res, message('O DeckVerse encontrou um erro temporário ao processar o comando.', [], [], true));
  }
}
