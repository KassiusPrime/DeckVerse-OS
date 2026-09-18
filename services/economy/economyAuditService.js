import {getSupabaseBrowserClient} from '../supabase/client.js';
export const economyAuditService=Object.freeze({recent:async(limit=100)=>{const {data,error}=await getSupabaseBrowserClient().from('economy_transactions').select('*').order('created_at',{ascending:false}).limit(Math.min(Math.max(Number(limit)||100,1),500));if(error)throw error;return data||[];}});
export default economyAuditService;
