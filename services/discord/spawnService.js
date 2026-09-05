const DISCORD_API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

export function hasManageGuildPermission(interaction) {
  try {
    const raw = interaction?.member?.permissions;
    if (!raw) return false;
    const bits = BigInt(raw);
    return (bits & MANAGE_GUILD) === MANAGE_GUILD || (bits & ADMINISTRATOR) === ADMINISTRATOR;
  } catch {
    return false;
  }
}

export async function touchGuildPlayer(supabase, interaction, discordId) {
  const guildId = interaction?.guild_id;
  if (!guildId || !discordId) return null;
  const { data, error } = await supabase.rpc('bot_touch_guild_player', {
    p_guild_id: guildId,
    p_discord_id: discordId,
  });
  if (error) throw error;
  return data;
}

export async function ensureGuildSettings(supabase, guildId) {
  const { data, error } = await supabase
    .from('discord_guild_settings')
    .select('*')
    .eq('guild_id', guildId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('discord_guild_settings')
    .insert({ guild_id: guildId, max_cards_per_wave: 100 })
    .select('*')
    .single();
  if (createError) throw createError;
  return created;
}

export async function updateGuildSpawnSettings(supabase, guildId, patch) {
  await ensureGuildSettings(supabase, guildId);
  const payload = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('discord_guild_settings')
    .update(payload)
    .eq('guild_id', guildId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function scheduleSpawnNow(supabase, guildId) {
  return updateGuildSpawnSettings(supabase, guildId, { next_spawn_at: new Date().toISOString() });
}

export async function createSpawnWave(supabase, guildId) {
  const { data, error } = await supabase.rpc('bot_create_spawn_wave', { p_guild_id: guildId });
  if (error) throw error;
  return data;
}

export async function claimSpawnCard(supabase, spawnCardId, discordId) {
  const { data, error } = await supabase.rpc('bot_claim_spawn_card', {
    p_spawn_card_id: spawnCardId,
    p_discord_id: discordId,
  });
  if (error) throw error;
  return data;
}

async function discordRequest(path, token, init = {}) {
  let attempt = 0;
  while (attempt < 4) {
    attempt += 1;
    const res = await fetch(`${DISCORD_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (res.status !== 429) {
      const text = await res.text();
      if (!res.ok) throw new Error(`DISCORD_HTTP_${res.status}:${text.slice(0, 500)}`);
      return text ? JSON.parse(text) : null;
    }
    const rate = await res.json().catch(() => ({}));
    const waitMs = Math.max(250, Math.ceil(Number(rate.retry_after || 1) * 1000));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error('DISCORD_RATE_LIMIT_EXCEEDED');
}

function rarityColor(rarity) {
  return ({ R: 0x7f8c8d, SR: 0x3498db, SSR: 0x9b59b6, UR: 0xf1c40f, LR: 0xe67e22, MR: 0xe74c3c })[rarity] || 0x7c5cff;
}

function waveChunks(cards, size = 5) {
  const out = [];
  for (let i = 0; i < cards.length; i += size) out.push(cards.slice(i, i + size));
  return out;
}

export async function sendSpawnWave(wave, token) {
  if (!wave?.channel_id || !Array.isArray(wave.cards) || !wave.cards.length) return { sentMessages: 0 };
  const chunks = waveChunks(wave.cards, 5);
  let sentMessages = 0;

  for (let index = 0; index < chunks.length; index += 1) {
    const cards = chunks[index];
    const embeds = cards.map((card) => ({
      title: `#${card.slot} · ${card.rarity || '—'} · ${card.name}`,
      description: `${card.collection || 'DeckVerse'} · ${card.entity_type || 'card'}`,
      color: rarityColor(card.rarity),
      ...(card.image_url ? { image: { url: card.image_url } } : {}),
      footer: { text: 'Cada jogador pode pegar 1 carta nesta rodada.' },
    }));
    const components = [{
      type: 1,
      components: cards.map((card) => ({
        type: 2,
        style: 3,
        label: `Pegar #${card.slot}`,
        custom_id: `spawnclaim:${card.spawn_card_id}`,
      })),
    }];
    const content = index === 0
      ? `🌌 **Spawn DeckVerse** · ${wave.card_count} cartas para ${wave.player_count} jogadores vinculados neste servidor. Expira em 10 min.`
      : '';
    await discordRequest(`/channels/${wave.channel_id}/messages`, token, {
      method: 'POST',
      body: JSON.stringify({ content, embeds, components, allowed_mentions: { parse: [] } }),
    });
    sentMessages += 1;
  }

  return { sentMessages };
}

export async function dueGuildSettings(supabase) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('discord_guild_settings')
    .select('*')
    .eq('auto_spawn_enabled', true)
    .not('spawn_channel_id', 'is', null)
    .or(`next_spawn_at.is.null,next_spawn_at.lte.${now}`)
    .order('next_spawn_at', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data || [];
}

export default {
  hasManageGuildPermission,
  touchGuildPlayer,
  ensureGuildSettings,
  updateGuildSpawnSettings,
  scheduleSpawnNow,
  createSpawnWave,
  claimSpawnCard,
  sendSpawnWave,
  dueGuildSettings,
};
