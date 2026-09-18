import { getSupabaseBrowserClient } from '../supabase/client.js';

const client=()=>getSupabaseBrowserClient();
const call=(name,args={})=>client().rpc(name,args).then(({data,error})=>{if(error)throw error;return data;});

export const economyRepository=Object.freeze({
  auditSnapshot:()=>call('economy_audit_snapshot'),
  recordCardAudit:(transactionId,eventType,cardId,playerId,quantity,metadata={})=>call('economy_audit_record_card',{p_transaction_id:transactionId,p_event_type:eventType,p_card_id:cardId,p_player_id:playerId,p_quantity:quantity,p_metadata:metadata}),
});
export default economyRepository;
