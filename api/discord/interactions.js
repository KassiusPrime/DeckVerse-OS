import { createClient } from '@supabase/supabase-js';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import {
  claimSpawnCard,
  ensureGuildSettings,
  hasManageGuildPermission,
  scheduleSpawnNow,
  touchGuildPlayer,
  updateGuildSpawnSettings,
} from '../../services/discord/spawnService.js';

const PAGE_SIZE = 5;
const DEFAULT_SUPABASE_URL = 'https://rrujnjraonckjdtpsfol.supabase.co';

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVER_CONFIG_MISSING');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function response(res, body, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function message(content, embeds = [], components = [], ephemeral = false) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, embeds, components, ...(ephemeral ? { flags: 64 } : {}) },
  };
}

function option(options, name) {
  return (options || []).find((entry) => entry.name === name);
}

function errorText(error) {
  const raw = String(error?.message || error || '');
  if (raw.includes('DISCORD_PROFILE_NOT_FOUND')) return 'Entre no DeckVerse com Discord antes de usar este comando.';
  if (raw.includes('INSUFFICIENT_BALANCE')) return 'Saldo insuficiente.';
  if (raw.includes('ROLL_COUNT_EXCEEDS_LEVEL_LIMIT')) return 'Essa quantidade de rolls excede o limite do seu nível.';
  if (raw.includes('SPAWN_CARD_NOT_FOUND')) return 'Essa carta do spawn não existe mais.';
  if (raw.includes('SPAWN_ALREADY_CLAIMED')) return 'Essa carta já foi pega.';
  if (raw.includes('PLAYER_ALREADY_CLAIMED_THIS_WAVE')) return 'Você já pegou uma carta nesta rodada.';
  if (raw.includes('SPAWN_EXPIRED')) return 'Esse spawn expirou.';
  return 'Não foi possível concluir esta ação agora.';
}

async function getProfileByDiscord(supabase, discordId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, discord_id, discord_username, display_name, avatar_url, astral_shards, ether_cores, level, cosmic_luck, pity_counter')
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
    .select('copies, cards(name, rarity, entity_type, image_url, collections(name))', { count: 'exact' })
    .eq('profile_id', profile.id)
    .order('acquired_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  return { profile, rows: data || [], page: Math.min(Math.max(0, page), totalPages - 1), totalPages, count: count || 0 };
}

function inventoryEmbed(result) {
  return {
    title: `Acervo de ${result.profile.display_name || result.profile.discord_username || 'Jogador'}`,
    description: result.count ? `${result.count} entidades únicas · página ${result.page + 1}/${result.totalPages}` : 'Este acervo ainda está vazio.',
    fields: result.rows.map((row) => ({
      name: `${row.cards?.rarity || '—'} · ${row.cards?.name || 'Entidade'}`,
      value: `${row.cards?.collections?.name || 'DeckVerse'} · ${row.copies}x`,
      inline: false,
    })),
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

async function runRoll(interaction, supabase, discordId) {
  const options = interaction.data?.options || [];
  const legacyCount = option(options, 'quantidade');
  const legacyCurrency = option(options, 'moeda');
  const count = Math.max(1, Math.min(50, Number(option(options, 'q')?.value || legacyCount?.value || (interaction.data?.name === 'rolls' ? 10 : 1))));
  const currencyValue = option(options, 'm')?.value || legacyCurrency?.value || 'astral';
  const currency = currencyValue === 'ether' ? 'ether_cores' : 'astral_shards';
  const { data, error } = await supabase.rpc('bot_roll_gacha', {
    p_discord_id: discordId,
    p_count: count,
    p_currency: currency,
  });
  if (error) return message(errorText(error), [], [], true);

  const pulls = Array.isArray(data?.pulls) ? data.pulls : [];
  const preview = pulls.slice(0, 10).map((pull) => `**${pull.rarity}** · ${pull.name}`).join('\n');
  const order = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];
  const top = [...pulls].sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity))[0];
  return message('', [{
    title: count === 1 ? 'Roll concluído' : `${count} rolls concluídos`,
    description: `${preview}${pulls.length > 10 ? `\n…e mais ${pulls.length - 10}` : ''}`,
    image: top?.image_url ? { url: top.image_url } : undefined,
    color: 0x7c5cff,
    footer: { text: `Pity ${data.pity_before} → ${data.pity_after} · custo ${data.cost}` },
  }]);
}

async function claimBySlot(interaction, supabase, discordId) {
  const guildId = interaction.guild_id;
  if (!guildId) return message('Use `/c` dentro do servidor.', [], [], true);
  const slot = Number(option(interaction.data?.options, 'n')?.value || 0);
  const { data: wave, error: waveError } = await supabase
    .from('discord_spawn_waves')
    .select('id')
    .eq('guild_id', guildId)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (waveError) throw waveError;
  if (!wave) return message('Não há spawn aberto neste servidor.', [], [], true);

  let query = supabase
    .from('discord_spawn_cards')
    .select('id, slot_index')
    .eq('wave_id', wave.id)
    .is('claimed_by_profile_id', null)
    .order('slot_index')
    .limit(1);
  if (slot > 0) query = query.eq('slot_index', slot);
  const { data: spawnCard, error } = await query.maybeSingle();
  if (error) throw error;
  if (!spawnCard) return message(slot > 0 ? `A carta #${slot} não está disponível.` : 'Não há carta disponível neste spawn.', [], [], true);

  try {
    const claimed = await claimSpawnCard(supabase, spawnCard.id, discordId);
    return message(`✅ Você pegou **${claimed.rarity || '—'} · ${claimed.name}**.`, [], [], true);
  } catch (claimError) {
    return message(errorText(claimError), [], [], true);
  }
}

async function handleSpawnSettings(interaction, supabase) {
  if (!interaction.guild_id) return message('Esse comando só funciona em servidor.', [], [], true);
  if (!hasManageGuildPermission(interaction)) return message('Você precisa de **Gerenciar Servidor** para usar `/s`.', [], [], true);

  const guildId = interaction.guild_id;
  const sub = interaction.data?.options?.[0];
  await ensureGuildSettings(supabase, guildId);
  if (!sub) return message('Use `/s ch`, `/s on`, `/s off`, `/s t`, `/s max` ou `/s now`.', [], [], true);

  if (sub.name === 'ch') {
    const channelId = option(sub.options, 'c')?.value;
    await updateGuildSpawnSettings(supabase, guildId, { spawn_channel_id: channelId });
    return message(`✅ Canal de spawn definido para <#${channelId}>.`, [], [], true);
  }
  if (sub.name === 'on') {
    const settings = await ensureGuildSettings(supabase, guildId);
    if (!settings.spawn_channel_id) return message('Defina o canal primeiro com `/s ch`.', [], [], true);
    await updateGuildSpawnSettings(supabase, guildId, { auto_spawn_enabled: true, next_spawn_at: new Date().toISOString() });
    return message('✅ Spawn automático ligado.', [], [], true);
  }
  if (sub.name === 'off') {
    await updateGuildSpawnSettings(supabase, guildId, { auto_spawn_enabled: false });
    return message('⏸️ Spawn automático desligado.', [], [], true);
  }
  if (sub.name === 't') {
    const minutes = Math.max(5, Math.min(1440, Number(option(sub.options, 'm')?.value || 30)));
    await updateGuildSpawnSettings(supabase, guildId, { spawn_interval_minutes: minutes });
    return message(`✅ Intervalo: **${minutes} min**.`, [], [], true);
  }
  if (sub.name === 'max') {
    const max = Math.max(1, Math.min(100, Number(option(sub.options, 'n')?.value || 100)));
    await updateGuildSpawnSettings(supabase, guildId, { max_cards_per_wave: max });
    return message(`✅ Máximo por rodada: **${max} cartas**.`, [], [], true);
  }
  if (sub.name === 'now') {
    await scheduleSpawnNow(supabase, guildId);
    return message('✅ Spawn agendado para o próximo ciclo automático.', [], [], true);
  }

  return message('Configuração não reconhecida.', [], [], true);
}

async function handleCommand(interaction, supabase) {
  const name = interaction.data?.name;
  const discordId = interaction.member?.user?.id || interaction.user?.id;
  if (!discordId) return message('Não consegui identificar sua conta do Discord.', [], [], true);

  if (interaction.guild_id) {
    try { await touchGuildPlayer(supabase, interaction, discordId); } catch (error) { console.warn('[DeckVerse Discord] guild touch failed', error?.message || error); }
  }

  if (name === 'r' || name === 'roll' || name === 'rolls') return runRoll(interaction, supabase, discordId);
  if (name === 'c') return claimBySlot(interaction, supabase, discordId);
  if (name === 's') return handleSpawnSettings(interaction, supabase);

  if (name === 'p' || name === 'profile') {
    const profile = await getProfileByDiscord(supabase, discordId);
    if (!profile) return message('Entre no DeckVerse com Discord antes de usar o bot.', [], [], true);
    return message('', [{
      title: profile.display_name || profile.discord_username || 'Perfil DeckVerse',
      thumbnail: profile.avatar_url ? { url: profile.avatar_url } : undefined,
      color: 0x7c5cff,
      fields: [
        { name: 'Nível', value: String(profile.level), inline: true },
        { name: 'Sorte', value: `${Number(profile.cosmic_luck || 1).toFixed(2)}x`, inline: true },
        { name: 'Astral', value: String(profile.astral_shards), inline: true },
        { name: 'Éter', value: String(profile.ether_cores), inline: true },
        { name: 'Pity', value: String(profile.pity_counter), inline: true },
      ],
    }]);
  }

  if (name === 'i' || name === 'inventory') {
    const result = await inventoryPage(supabase, discordId, 0);
    if (result.missing) return message('Entre no DeckVerse com Discord antes de usar o bot.', [], [], true);
    return message('', [inventoryEmbed(result)], paginator(discordId, result.page, result.totalPages), true);
  }

  if (name === 'h' || name === 'support') {
    return message('`/r` roll · `/c` pegar · `/i` inventário · `/p` perfil · `/s` spawn (admin).\nEx.: `/r q:10`, `/s ch`, `/s on`, `/s t m:15`.', [], [], true);
  }

  return message('Comando não reconhecido.', [], [], true);
}

function disableSpawnButton(components, customId, username) {
  return (components || []).map((row) => ({
    ...row,
    components: (row.components || []).map((button) => button.custom_id === customId
      ? { ...button, disabled: true, style: 2, label: `✅ ${username || 'Pegou'}`.slice(0, 80) }
      : button),
  }));
}

async function handleComponent(interaction, supabase) {
  const customId = interaction.data?.custom_id || '';
  const clicker = interaction.member?.user?.id || interaction.user?.id;
  if (!clicker) return message('Não consegui identificar sua conta.', [], [], true);

  if (interaction.guild_id) {
    try { await touchGuildPlayer(supabase, interaction, clicker); } catch (error) { console.warn('[DeckVerse Discord] guild touch failed', error?.message || error); }
  }

  if (customId.startsWith('spawnclaim:')) {
    const spawnCardId = customId.split(':')[1];
    try {
      await claimSpawnCard(supabase, spawnCardId, clicker);
      const username = interaction.member?.user?.global_name || interaction.member?.user?.username || 'Pegou';
      return {
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: { components: disableSpawnButton(interaction.message?.components, customId, username) },
      };
    } catch (error) {
      return message(errorText(error), [], [], true);
    }
  }

  if (customId.startsWith('inventory:')) {
    const [, ownerDiscordId, pageRaw] = customId.split(':');
    if (clicker !== ownerDiscordId) return message('Este inventário pertence a outra pessoa.', [], [], true);
    const result = await inventoryPage(supabase, ownerDiscordId, Number(pageRaw || 0));
    if (result.missing) return message('Perfil não encontrado.', [], [], true);
    return {
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: { embeds: [inventoryEmbed(result)], components: paginator(ownerDiscordId, result.page, result.totalPages) },
    };
  }

  return message('Ação expirada.', [], [], true);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return response(res, { error: 'Method not allowed' }, 405);
  const rawBody = await readRawBody(req);
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp || !(await verifyKey(rawBody, signature, timestamp, publicKey))) {
    return response(res, { error: 'Invalid request signature' }, 401);
  }

  let interaction;
  try { interaction = JSON.parse(rawBody.toString('utf8')); } catch { return response(res, { error: 'Invalid JSON' }, 400); }
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
