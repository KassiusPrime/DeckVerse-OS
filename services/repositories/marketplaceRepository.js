import { getSupabaseBrowserClient } from '../supabase/client.js';

const client = () => getSupabaseBrowserClient();

export async function getCurrentProfile() {
  const supabase = client();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth?.user?.id) throw Object.assign(new Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' });
  const { data, error } = await supabase.from('profiles').select('id,display_name,discord_username,username,avatar_url,deck_credits,status').eq('id',auth.user.id).single();
  if (error) throw error;
  return data;
}

export async function browse() { const {data,error}=await client().rpc('browse_market'); if(error)throw error; return data||[]; }
export async function getOwnedCards(profileId) {
  const {data,error}=await client().from('rosters').select('id,card_id,copies,is_equipped,cards(id,name,rarity,entity_type,image_url,collection_id,collections(name))').eq('profile_id',profileId).gt('copies',0).order('acquired_at',{ascending:false});
  if(error)throw error; return data||[];
}
export async function createListing(cardId,quantity,priceDc){const {data,error}=await client().rpc('create_market_listing',{p_card_id:cardId,p_quantity:quantity,p_price_dc:priceDc});if(error)throw error;return data;}
export async function buyListing(listingId,transactionId){const {data,error}=await client().rpc('buy_market_listing_with_transaction',{p_listing_id:listingId,p_transaction_id:transactionId});if(error)throw error;return data;}
export async function cancelListing(listingId){const {data,error}=await client().rpc('cancel_market_listing',{p_listing_id:listingId});if(error)throw error;return data;}
export const marketplaceRepository=Object.freeze({getCurrentProfile,browse,getOwnedCards,createListing,buyListing,cancelListing});
export default marketplaceRepository;
