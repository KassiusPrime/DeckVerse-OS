import {getSupabaseBrowserClient} from '../supabase/client.js';
const client=()=>getSupabaseBrowserClient();
const call=(name,args)=>client().rpc(name,args).then(({data,error})=>{if(error)throw error;return data;});
export const observabilityRepository=Object.freeze({snapshot:()=>call('observability_snapshot'),recordError:(code,message,source=null,metadata={})=>call('record_error_log',{p_error_code:code,p_message:message,p_source:source,p_metadata:metadata}),recordSystem:(eventType,entityType=null,entityId=null,metadata={})=>call('record_system_log',{p_event_type:eventType,p_entity_type:entityType,p_entity_id:entityId,p_metadata:metadata})});
export default observabilityRepository;
