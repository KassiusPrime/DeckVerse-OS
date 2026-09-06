import { getSupabaseBrowserClient } from './client.js';

async function rpc(name, params = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  return data;
}

export function getRollProgression() {
  return rpc('get_roll_progression');
}

export function setLevelProgression(rollPoints, luckPoints) {
  return rpc('set_level_progression', {
    p_roll_points: Math.max(0, Math.floor(Number(rollPoints) || 0)),
    p_luck_points: Math.max(0, Math.floor(Number(luckPoints) || 0)),
  });
}

export function buyRollLimitUnlock() {
  return rpc('buy_roll_limit_unlock');
}

export function sellCard(cardId, quantity = 1) {
  return rpc('sell_card', {
    p_card_id: String(cardId || ''),
    p_quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
  });
}

export function browseMarket() {
  return rpc('browse_market');
}

export function createMarketListing(cardId, quantity, priceDc) {
  return rpc('create_market_listing', {
    p_card_id: String(cardId || ''),
    p_quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
    p_price_dc: Math.max(1, Math.floor(Number(priceDc) || 1)),
  });
}

export function buyMarketListing(listingId) {
  return rpc('buy_market_listing', { p_listing_id: listingId });
}

export function cancelMarketListing(listingId) {
  return rpc('cancel_market_listing', { p_listing_id: listingId });
}

export function getMyTrades() {
  return rpc('get_my_trades');
}

export async function getCardsByIds(ids = []) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (!unique.length) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id,name,rarity,entity_type,image_url,collection_id,collections(name)')
    .in('id', unique);
  if (error) throw error;
  return data || [];
}

export function createTrade(recipient) {
  return rpc('create_trade', { p_recipient: String(recipient || '').trim() });
}

export function setTradeOffer(tradeId, assets = [], deckCredits = 0) {
  return rpc('set_trade_offer', {
    p_trade_id: tradeId,
    p_assets: assets,
    p_deck_credits: Math.max(0, Math.floor(Number(deckCredits) || 0)),
  });
}

export function confirmTradeProposal(tradeId) {
  return rpc('confirm_trade_proposal', { p_trade_id: tradeId });
}

export function acceptTrade(tradeId) {
  return rpc('accept_trade', { p_trade_id: tradeId });
}

export function closeTrade(tradeId, status = 'cancelled') {
  return rpc('close_trade', { p_trade_id: tradeId, p_status: status });
}

export default {
  getRollProgression,
  setLevelProgression,
  buyRollLimitUnlock,
  sellCard,
  browseMarket,
  createMarketListing,
  buyMarketListing,
  cancelMarketListing,
  getMyTrades,
  getCardsByIds,
  createTrade,
  setTradeOffer,
  confirmTradeProposal,
  acceptTrade,
  closeTrade,
};
