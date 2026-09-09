export async function listDecks(supabase, discordId) {
  const { data, error } = await supabase.rpc('bot_list_decks', { p_discord_id: discordId });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getDeck(supabase, discordId, invocationCode) {
  const { data, error } = await supabase.rpc('bot_get_deck', {
    p_discord_id: discordId,
    p_invocation_code: invocationCode,
  });
  if (error) throw error;
  return data;
}

export async function getPrimaryDeck(supabase, discordId) {
  const { data, error } = await supabase.rpc('bot_get_primary_deck', { p_discord_id: discordId });
  if (error) throw error;
  return data;
}

export function deckErrorText(error) {
  const raw = String(error?.message || error || '');
  if (raw.includes('DECK_NOT_FOUND')) return 'Deck não encontrado, não está disponível para invocação ou o código está incorreto.';
  if (raw.includes('PRIMARY_DECK_NOT_FOUND')) return 'Você ainda não definiu um deck principal invocável no DeckVerse.';
  return 'Não foi possível carregar o deck agora.';
}

export function deckEmbed(deck, mode = 'view') {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  const lines = cards.slice(0, 20).map((card) => `${card.slot}. **${card.name || 'Entidade'}** · ${card.rarity || '—'}${card.quantity > 1 ? ` · ${card.quantity}x` : ''}`);
  return {
    title: `${mode === 'invoke' ? '🌌 Invocação · ' : ''}${deck?.name || 'Deck'}`,
    description: deck?.description || 'Deck configurado no DeckVerse.',
    fields: [
      { name: 'Código', value: `\`${deck?.invocation_code || '—'}\``, inline: true },
      { name: 'Cartas', value: String(cards.length), inline: true },
      { name: 'Status', value: deck?.is_invokable ? 'Invocável' : 'Bloqueado', inline: true },
      ...(lines.length ? [{ name: 'Composição', value: `${lines.join('\n')}${cards.length > 20 ? `\n…e mais ${cards.length - 20}` : ''}`, inline: false }] : []),
    ],
    thumbnail: deck?.cards?.[0]?.image_url ? { url: deck.cards[0].image_url } : undefined,
    color: mode === 'invoke' ? 0x7c5cff : 0x5865f2,
    footer: { text: 'DeckVerse · composição criada no Deck Builder' },
  };
}
