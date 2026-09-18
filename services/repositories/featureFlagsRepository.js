import {getSupabaseBrowserClient} from '../supabase/client.js';
const client=()=>getSupabaseBrowserClient();
const call=(name,args)=>client().rpc(name,args).then(({data,error})=>{if(error)throw error;return data;});
export const featureFlagsRepository=Object.freeze({isEnabled:(name,environment='production')=>call('feature_flag_is_enabled',{p_name:name,p_environment:environment}),snapshot:(environment='production')=>call('feature_flags_snapshot',{p_environment:environment}),set:(name,enabled,environment='production',description='')=>call('set_feature_flag',{p_name:name,p_enabled:enabled,p_environment:environment,p_description:description})});
export default featureFlagsRepository;
