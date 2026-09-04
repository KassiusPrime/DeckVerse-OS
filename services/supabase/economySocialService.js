import { getSupabaseBrowserClient } from './client.js';

const client = () => getSupabaseBrowserClient();

export async function listBanners() {
  const { data, error } = await client().from('gacha_banners').select('id,collection_id,name,cost_1x,cost_10x,pity_rare,pity_epic,starts_at,ends_at,is_active,collections(name,cover_url)').eq('is_active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function rollBanner(bannerId, count = 1) {
  const { data, error } = await client().rpc('roll_banner_gacha', { p_banner_id: bannerId, p_count: count === 10 ? 10 : 1 });
  if (error) throw error;
  return data;
}

export async function getDailyMarket() {
  const { data, error } = await client().rpc('get_daily_market');
  if (error) throw error;
  return data || [];
}

export async function buyDailyMarketCard(cardId) {
  const { data, error } = await client().rpc('buy_daily_market_card', { p_card_id: cardId });
  if (error) throw error;
  return data;
}

export async function getCardEconomy(cardId) {
  const { data, error } = await client().rpc('get_card_economy', { p_card_id: cardId });
  if (error) throw error;
  return data;
}

export async function liquidateCard(cardId, quantity = 1) {
  const { data, error } = await client().rpc('liquidate_card', { p_card_id: cardId, p_quantity: Math.max(1, Math.trunc(quantity || 1)) });
  if (error) throw error;
  return data;
}

export async function giftAssets({ recipient, cardId = null, quantity = 0, deckCredits = 0 }) {
  const { data, error } = await client().rpc('gift_assets', {
    p_recipient: String(recipient || '').trim(),
    p_card_id: cardId || null,
    p_quantity: Math.max(0, Math.trunc(quantity || 0)),
    p_deck_credits: Math.max(0, Math.trunc(deckCredits || 0)),
  });
  if (error) throw error;
  return data;
}

export async function listMyTrades() {
  const { data, error } = await client().from('trades').select('*').order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function createTrade(recipient) {
  const { data, error } = await client().rpc('create_trade', { p_recipient: String(recipient || '').trim() });
  if (error) throw error;
  return data;
}

export async function setTradeOffer(tradeId, assets = [], deckCredits = 0) {
  const cleanAssets = (assets || []).filter(Boolean).map((asset) => ({ card_id: asset.card_id || asset.id, quantity: Math.max(1, Math.trunc(asset.quantity || 1)) }));
  const { data, error } = await client().rpc('set_trade_offer', { p_trade_id: tradeId, p_assets: cleanAssets, p_deck_credits: Math.max(0, Math.trunc(deckCredits || 0)) });
  if (error) throw error;
  return data;
}

export async function confirmTrade(tradeId) {
  const { data, error } = await client().rpc('confirm_trade_proposal', { p_trade_id: tradeId });
  if (error) throw error;
  return data;
}

export async function acceptTrade(tradeId) {
  const { data, error } = await client().rpc('accept_trade', { p_trade_id: tradeId });
  if (error) throw error;
  return data;
}

export async function closeTrade(tradeId, status = 'cancelled') {
  const { data, error } = await client().rpc('close_trade', { p_trade_id: tradeId, p_status: status === 'rejected' ? 'rejected' : 'cancelled' });
  if (error) throw error;
  return data;
}

export async function importMudaeCards(names) {
  const cleaned = [...new Set((names || []).map((name) => String(name || '').trim()).filter(Boolean))];
  const { data, error } = await client().rpc('import_mudae_cards', { p_names: cleaned });
  if (error) throw error;
  return data;
}

export async function getMyEquipment(characterCardId) {
  const { data, error } = await client().rpc('get_my_equipment', { p_character_card_id: characterCardId });
  if (error) throw error;
  return data || [];
}

export async function getMyEquippableItems() {
  const { data, error } = await client().rpc('get_my_equippable_items');
  if (error) throw error;
  return data || [];
}

export async function getEffectiveCardStats(cardId) {
  const { data, error } = await client().rpc('get_effective_card_stats', { p_card_id: cardId });
  if (error) throw error;
  return data;
}

export async function equipItem(characterCardId, slot, itemCardId) {
  const { data, error } = await client().rpc('equip_item', { p_character_card_id: characterCardId, p_slot: slot, p_item_card_id: itemCardId });
  if (error) throw error;
  return data;
}

export async function unequipItem(characterCardId, slot) {
  const { data, error } = await client().rpc('unequip_item', { p_character_card_id: characterCardId, p_slot: slot });
  if (error) throw error;
  return data;
}

export async function getMyRosterForTrading() {
  const { data, error } = await client().from('rosters').select('card_id,copies,cards(id,name,rarity,entity_type,image_url,collection_id)').order('acquired_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ ...row.cards, copies: row.copies, card_id: row.card_id })).filter(Boolean);
}

export default {
  listBanners, rollBanner, getDailyMarket, buyDailyMarketCard, getCardEconomy, liquidateCard,
  giftAssets, listMyTrades, createTrade, setTradeOffer, confirmTrade, acceptTrade, closeTrade,
  importMudaeCards, getMyEquipment, getMyEquippableItems, getEffectiveCardStats, equipItem, unequipItem,
  getMyRosterForTrading,
};
