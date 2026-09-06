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
  if (raw.includes('INSUFFICIENT_BALANCE')) return 'Saldo insuficiente para esse giro.';
  if (raw.includes('INSUFFICIENT_FREE_ROLLS')) return 'Você não possui rolls gratuitos suficientes.';
  if (raw.includes('INSUFFICIENT_DECK_CREDITS')) return 'Deck Credits insuficientes.';
  if (raw.includes('ROLL_COUNT_EXCEEDS_LEVEL_LIMIT')) return 'Essa quantidade excede seu limite atual. Use `/prog` para distribuir pontos de nível ou `/unlock` para comprar +10.';
  if (raw.includes('ROLL_LIMIT_ALREADY_MAX')) return 'Seu limite de giros já está no máximo.';
  if (raw.includes('PROGRESSION_POINTS_EXCEEDED')) return 'Você tentou distribuir mais pontos do que seu nível liberou.';
  if (raw.includes('INVALID_PROGRESSION_ALLOCATION')) return 'Distribuição de progressão inválida.';
  if (raw.includes('INSUFFICIENT_COPIES')) return 'Você não possui cópias suficientes dessa carta.';
  if (raw.includes('CARD_IS_EQUIPPED')) return 'Remova a carta do equipamento antes de vender a última cópia.';
  if (raw.includes('CARD_HAS_NO_SELL_VALUE')) return 'Essa carta não possui valor de liquidação.';
  if (raw.includes('RECIPIENT_NOT_FOUND')) return 'Jogador não encontrado. Ele precisa ter uma conta DeckVerse vinculada ao Discord.';
  if (raw.includes('CANNOT_TRADE_SELF')) return 'Você não pode abrir uma troca consigo mesmo.';
  if (raw.includes('TRADE_NOT_FOUND')) return 'Troca não encontrada.';
  if (raw.includes('TRADE_NOT_READY')) return 'Os dois jogadores precisam confirmar a proposta antes do aceite final.';
  if (raw.includes('TRADE_NOT_EDITABLE')) return 'Essa troca não pode mais ser editada.';
  if (raw.includes('TRADE_ASSET_UNAVAILABLE')) return 'A carta oferecida não está mais disponível no acervo.';
  if (raw.includes('SENDER_INSUFFICIENT_DECK_CREDITS') || raw.includes('RECEIVER_INSUFFICIENT_DECK_CREDITS')) return 'Um dos jogadores não possui mais os Deck Credits prometidos.';
  if (raw.includes('SPAWN_CARD_NOT_FOUND')) return 'Essa carta do spawn não existe mais.';
  if (raw.includes('SPAWN_ALREADY_CLAIMED')) return 'Essa carta já foi pega.';
  if (raw.includes('PLAYER_ALREADY_CLAIMED_THIS_WAVE')) return 'Você já pegou uma carta nesta rodada.';
  if (raw.includes('SPAWN_EXPIRED')) return 'Esse spawn expirou.';
  return 'Não foi possível concluir esta ação agora.';
}

async function getProfileByDiscord(supabase, discordId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, discord_id, discord_username, display_name, avatar_url, astral_shards, ether_cores, deck_credits, level, cosmic_luck, pity_counter')
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
    .select('card_id, copies, cards(name, rarity, entity_type, image_url, collections(name))', { count: 'exact' })
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
    description: result.count ? `${result.count} entidades únicas · página ${result.page + 1}/${result.totalPages}\nUse o ID mostrado abaixo em \`/v\` e \`/t offer\`.` : 'Este acervo ainda está vazio.',
    fields: result.rows.map((row) => ({
      name: `${row.cards?.rarity || '—'} · ${row.cards?.name || 'Entidade'}`,
      value: `${row.cards?.collections?.name || 'DeckVerse'} · ${row.copies}x\nID: \`${row.card_id}\``,
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
  const count = Math.max(1, Math.min(100, Number(option(options, 'q')?.value || legacyCount?.value || (interaction.data?.name === 'rolls' ? 10 : 1))));
  const currencyValue = option(options, 'm')?.value || legacyCurrency?.value || 'astral';
  const currency = currencyValue === 'ether' ? 'ether_cores' : currencyValue === 'gratis' ? 'free_rolls' : 'astral_shards';
  const { data, error } = await supabase.rpc('bot_roll_gacha', {
    p_discord_id: discordId,
    p_count: count,
    p_currency: currency,
  });
  if (error) return message(errorText(error), [], [], true);

  const pulls = Array.isArray(data?.pulls) ? data.pulls : [];
  const preview = pulls.slice(0, 10).map((pull) => `**${pull.rarity}** · ${pull.name}${pull.key_gained ? ' 🔑' : ''}${pull.wished ? ' 💛' : ''}`).join('\n');
  const order = ['R', 'SR', 'SSR', 'UR', 'LR', 'MR'];
  const top = [...pulls].sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity))[0];
  return message('', [{
    title: count === 1 ? 'Roll concluído' : `${count} rolls concluídos`,
    description: `${preview}${pulls.length > 10 ? `\n…e mais ${pulls.length - 10}` : ''}`,
    image: top?.image_url ? { url: top.image_url } : undefined,
    color: 0x7c5cff,
    footer: { text: `Pity ${data.pity_before} → ${data.pity_after} · limite ${data.max_batch || '—'} · sorte ${Number(data.cosmic_luck || 1).toFixed(2)}x · custo ${data.cost}` },
  }]);
}

async function runSell(interaction, supabase, discordId) {
  const options = interaction.data?.options || [];
  const cardId = String(option(options, 'card')?.value || '').trim();
  const quantity = Math.max(1, Math.min(999, Number(option(options, 'q')?.value || 1)));
  if (!cardId) return message('Informe o ID da carta. Veja seus IDs em `/i`.', [], [], true);
  const { data, error } = await supabase.rpc('bot_sell_card', { p_discord_id: discordId, p_card_id: cardId, p_quantity: quantity });
  if (error) return message(errorText(error), [], [], true);
  return message(`💰 Venda concluída: **${quantity}x** \`${cardId}\` por **${Number(data.received_dc || 0).toLocaleString('pt-BR')} DC**.\nSaldo: **${Number(data.deck_credits || 0).toLocaleString('pt-BR')} DC**.`, [], [], true);
}

async function getProgression(supabase, discordId) {
  const { data, error } = await supabase.rpc('bot_get_roll_progression', { p_discord_id: discordId });
  if (error) throw error;
  return data;
}

function progressionEmbed(data) {
  return {
    title: 'Progressão de giros',
    color: 0x7c5cff,
    description: `Nível **${data.level}** libera **${data.available_points}** ponto(s). Você pode redistribuí-los a qualquer momento com \`/prog limite:X sorte:Y\`.`,
    fields: [
      { name: 'Limite', value: `${data.max_batch}x`, inline: true },
      { name: 'Pontos em limite', value: String(data.roll_points), inline: true },
      { name: 'Pontos em sorte', value: String(data.luck_points), inline: true },
      { name: 'Sorte cósmica', value: `${Number(data.cosmic_luck || 1).toFixed(2)}x`, inline: true },
      { name: 'Bônus comprado', value: `+${data.purchased_roll_limit_bonus}`, inline: true },
      { name: 'Pontos livres', value: String(data.unallocated_points), inline: true },
      { name: 'Expansor +10', value: `${Number(data.roll_unlock_cost_dc || 2500).toLocaleString('pt-BR')} DC`, inline: false },
    ],
  };
}

async function runProgression(interaction, supabase, discordId) {
  try {
    const current = await getProgression(supabase, discordId);
    const limitOpt = option(interaction.data?.options, 'limite');
    const luckOpt = option(interaction.data?.options, 'sorte');
    if (!limitOpt && !luckOpt) return message('', [progressionEmbed(current)], [], true);
    const rollPoints = limitOpt ? Math.max(0, Number(limitOpt.value || 0)) : Number(current.roll_points || 0);
    const luckPoints = luckOpt ? Math.max(0, Number(luckOpt.value || 0)) : Number(current.luck_points || 0);
    const { data, error } = await supabase.rpc('bot_set_level_progression', { p_discord_id: discordId, p_roll_points: rollPoints, p_luck_points: luckPoints });
    if (error) return message(errorText(error), [], [], true);
    return message('✅ Progressão redistribuída.', [progressionEmbed(data)], [], true);
  } catch (error) {
    return message(errorText(error), [], [], true);
  }
}

async function runUnlock(supabase, discordId) {
  const { data, error } = await supabase.rpc('bot_buy_roll_limit_unlock', { p_discord_id: discordId });
  if (error) return message(errorText(error), [], [], true);
  return message(`🔓 **Expansor de Giros +10** comprado por **${Number(data.cost_dc || 0).toLocaleString('pt-BR')} DC**.`, [progressionEmbed(data.progression)], [], true);
}

function tradeStatusLabel(status) {
  return ({ draft: 'Em negociação', ready: 'Pronta', completed: 'Concluída', cancelled: 'Cancelada', rejected: 'Recusada' })[status] || status;
}

async function tradeListEmbed(supabase, discordId) {
  const profile = await getProfileByDiscord(supabase, discordId);
  if (!profile) throw new Error('DISCORD_PROFILE_NOT_FOUND');
  const { data: trades, error } = await supabase.from('trades').select('*').or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  if (!trades?.length) return { title: 'Suas trocas', description: 'Nenhuma troca encontrada.', color: 0x7c5cff };
  const profileIds = [...new Set(trades.flatMap((t) => [t.sender_profile_id, t.receiver_profile_id]))];
  const { data: people } = await supabase.from('profiles').select('id,display_name,discord_username,discord_id').in('id', profileIds);
  const peopleMap = new Map((people || []).map((p) => [p.id, p]));
  const lines = trades.map((t) => {
    const otherId = t.sender_profile_id === profile.id ? t.receiver_profile_id : t.sender_profile_id;
    const other = peopleMap.get(otherId);
    const name = other?.display_name || other?.discord_username || other?.discord_id || 'Jogador';
    return `**${tradeStatusLabel(t.status)}** · ${name}\n\`${t.id}\``;
  });
  return { title: 'Suas trocas', description: lines.join('\n\n'), color: 0x7c5cff, footer: { text: 'Use o ID com /t offer, /t confirm, /t accept ou /t cancel.' } };
}

async function runTrade(interaction, supabase, discordId) {
  const sub = interaction.data?.options?.[0];
  if (!sub || sub.name === 'list') {
    try { return message('', [await tradeListEmbed(supabase, discordId)], [], true); } catch (error) { return message(errorText(error), [], [], true); }
  }
  let rpcName = '';
  let params = { p_discord_id: discordId };
  if (sub.name === 'new') {
    rpcName = 'bot_create_trade';
    params.p_recipient = String(option(sub.options, 'user')?.value || '').trim();
  } else if (sub.name === 'offer') {
    rpcName = 'bot_set_trade_offer';
    params.p_trade_id = String(option(sub.options, 'id')?.value || '').trim();
    params.p_card_id = String(option(sub.options, 'card')?.value || '').trim() || null;
    params.p_quantity = Math.max(1, Number(option(sub.options, 'q')?.value || 1));
    params.p_deck_credits = Math.max(0, Number(option(sub.options, 'dc')?.value || 0));
  } else if (sub.name === 'confirm') {
    rpcName = 'bot_confirm_trade';
    params.p_trade_id = String(option(sub.options, 'id')?.value || '').trim();
  } else if (sub.name === 'accept') {
    rpcName = 'bot_accept_trade';
    params.p_trade_id = String(option(sub.options, 'id')?.value || '').trim();
  } else if (sub.name === 'cancel' || sub.name === 'reject') {
    rpcName = 'bot_close_trade';
    params.p_trade_id = String(option(sub.options, 'id')?.value || '').trim();
    params.p_status = sub.name === 'reject' ? 'rejected' : 'cancelled';
  } else return message('Subcomando de troca inválido.', [], [], true);

  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) return message(errorText(error), [], [], true);
  const status = data?.status || 'draft';
  const text = sub.name === 'new'
    ? `🤝 Troca aberta. ID: \`${data.id}\`\nAgora cada lado usa \`/t offer\` e depois \`/t confirm\`.`
    : sub.name === 'offer'
      ? `✅ Sua oferta foi salva na troca \`${data.id}\`. Qualquer edição remove as confirmações anteriores.`
      : sub.name === 'confirm'
        ? `✅ Confirmação registrada. Estado: **${tradeStatusLabel(status)}**.`
        : sub.name === 'accept'
          ? `✅ Aceite registrado. Estado: **${tradeStatusLabel(status)}**.${status === 'completed' ? ' As cartas e Deck Credits já foram transferidos.' : ' Falta o aceite da outra pessoa.'}`
          : `✅ Troca ${sub.name === 'reject' ? 'recusada' : 'cancelada'}.`;
  return message(text, [], [], true);
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
  if (name === 'v' || name === 'sell') return runSell(interaction, supabase, discordId);
  if (name === 'prog') return runProgression(interaction, supabase, discordId);
  if (name === 'unlock') return runUnlock(supabase, discordId);
  if (name === 't' || name === 'trade') return runTrade(interaction, supabase, discordId);
  if (name === 'c') return claimBySlot(interaction, supabase, discordId);
  if (name === 's') return handleSpawnSettings(interaction, supabase);

  if (name === 'p' || name === 'profile') {
    const profile = await getProfileByDiscord(supabase, discordId);
    if (!profile) return message('Entre no DeckVerse com Discord antes de usar o bot.', [], [], true);
    let progression = null;
    try { progression = await getProgression(supabase, discordId); } catch { /* profile still works */ }
    return message('', [{
      title: profile.display_name || profile.discord_username || 'Perfil DeckVerse',
      thumbnail: profile.avatar_url ? { url: profile.avatar_url } : undefined,
      color: 0x7c5cff,
      fields: [
        { name: 'Nível', value: String(profile.level), inline: true },
        { name: 'Sorte', value: `${Number(progression?.cosmic_luck || profile.cosmic_luck || 1).toFixed(2)}x`, inline: true },
        { name: 'Limite', value: `${progression?.max_batch || 10}x`, inline: true },
        { name: 'Deck Credits', value: Number(profile.deck_credits || 0).toLocaleString('pt-BR'), inline: true },
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
    return message([
      '**DeckVerse — comandos rápidos**',
      '`/r q:10 m:astral` — girar cartas',
      '`/c n:1` — pegar carta do spawn',
      '`/i` — acervo e IDs das cartas',
      '`/p` — perfil, sorte, limite e saldos',
      '`/prog` — ver/redistribuir pontos de nível',
      '`/unlock` — comprar +10 no limite de giros',
      '`/v card:ID q:1` — vender carta ao sistema',
      '`/t list` / `new` / `offer` / `confirm` / `accept` — trocas P2P',
      '`/s ...` — configurar spawn (Gerenciar Servidor)',
    ].join('\n'), [], [], true);
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
    return response(res, message(errorText(error), [], [], true));
  }
}
