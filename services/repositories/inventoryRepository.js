import { getSupabaseBrowserClient } from '../supabase/client.js';
import { getMyRosterWithArtwork,getMyCardArtwork,getMyCardOwnership,savePlayerCardArtwork,clearPlayerCardArtwork } from '../supabase/playerArtworkService.js';
const client=()=>getSupabaseBrowserClient();
async function adminGrantCard(profileId,cardId,copies,reason,transactionId){const {data,error}=await client().rpc('admin_grant_card_with_transaction',{p_profile_id:profileId,p_card_id:cardId,p_copies:copies,p_reason:reason,p_transaction_id:transactionId});if(error)throw error;return data;}
async function adminRemoveCard(profileId,cardId,copies,reason,transactionId){const {data,error}=await client().rpc('admin_remove_card_with_transaction',{p_profile_id:profileId,p_card_id:cardId,p_copies:copies,p_reason:reason,p_transaction_id:transactionId});if(error)throw error;return data;}
async function adminTransferCard(fromProfileId,toProfileId,cardId,copies,reason,transactionId){const {data,error}=await client().rpc('admin_transfer_card_with_transaction',{p_from_profile_id:fromProfileId,p_to_profile_id:toProfileId,p_card_id:cardId,p_copies:copies,p_reason:reason,p_transaction_id:transactionId});if(error)throw error;return data;}
async function equipItem(characterCardId,slot,itemCardId){const {data,error}=await client().rpc('equip_item',{p_character_card_id:characterCardId,p_slot:slot,p_item_card_id:itemCardId});if(error)throw error;return data;}
async function unequipItem(characterCardId,slot){const {data,error}=await client().rpc('unequip_item',{p_character_card_id:characterCardId,p_slot:slot});if(error)throw error;return data;}
export const inventoryRepository=Object.freeze({getMyRosterWithArtwork,getMyCardArtwork,getMyCardOwnership,savePlayerCardArtwork,clearPlayerCardArtwork,adminGrantCard,adminRemoveCard,adminTransferCard,equipItem,unequipItem});
export default inventoryRepository;
