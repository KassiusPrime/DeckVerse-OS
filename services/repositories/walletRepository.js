import { getSupabaseBrowserClient } from '../supabase/client.js';

const supabase=()=>getSupabaseBrowserClient();
const rpc=(name,args)=>supabase().rpc(name,args).then(({data,error})=>{if(error) throw error; return data;});

export const walletRepository=Object.freeze({
 grant:(playerId,amount,type,referenceType=null,referenceId=null,reason='Currency grant')=>rpc('grant_currency',{p_player_id:playerId,p_amount:amount,p_transaction_type:type,p_reference_type:referenceType,p_reference_id:referenceId,p_reason:reason}),
 remove:(playerId,amount,type,referenceType=null,referenceId=null,reason='Currency removal')=>rpc('remove_currency',{p_player_id:playerId,p_amount:amount,p_transaction_type:type,p_reference_type:referenceType,p_reference_id:referenceId,p_reason:reason}),
 transfer:(from,to,amount,referenceType=null,referenceId=null,reason='Currency transfer')=>rpc('transfer_currency',{p_from:from,p_to:to,p_amount:amount,p_reference_type:referenceType,p_reference_id:referenceId,p_reason:reason}),
});
export default walletRepository;
