import { getSupabaseBrowserClient } from '../supabase/client.js';

const client = () => getSupabaseBrowserClient();
const clean = (value) => String(value ?? '').trim();

export async function getCurrentActor() {
  const supabase = client();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth?.user?.id) { const error = new Error('AUTH_REQUIRED'); error.code = 'AUTH_REQUIRED'; throw error; }
  const { data: profile, error } = await supabase.from('profiles').select('id, role, status').eq('id', auth.user.id).maybeSingle();
  if (error) throw error;
  return { ...auth.user, role: profile?.role || 'guest', status: profile?.status || 'active', profile };
}

export async function searchCatalog(filters = {}) {
  const { data, error } = await client().rpc('admin_search_catalog', { p_query:clean(filters.query), p_kind:clean(filters.kind)||'all', p_collection_id:filters.collectionId??null, p_rarity:filters.rarity??null, p_letter:filters.letter??null, p_limit:Math.min(300,Math.max(20,Number(filters.limit)||300)) });
  if (error) throw error; return data || [];
}
export async function updateCollection(id,payload={}) { const {data,error}=await client().rpc('admin_update_collection_content',{p_id:id,p_synopsis:payload.synopsis??null,p_is_active:payload.is_active??null,p_cover_url:payload.cover_url??null,p_clear_image:payload.clear_image===true}); if(error)throw error; return data; }
export async function updateCard(id,payload={}) { const {data,error}=await client().rpc('admin_update_card_content',{p_id:id,p_synopsis:payload.synopsis??null,p_is_active:payload.is_active??null,p_image_url:payload.image_url??null,p_clear_image:payload.clear_image===true}); if(error)throw error; return data; }
export async function updateForm(id,payload={}) { const {data,error}=await client().rpc('admin_update_form_content',{p_id:id,p_synopsis:payload.synopsis??null,p_is_active:payload.is_active??null,p_image_url:payload.image_url??null,p_clear_image:payload.clear_image===true}); if(error)throw error; return data; }
export const catalogRepository=Object.freeze({getCurrentActor,searchCatalog,updateCollection,updateCard,updateForm});
export default catalogRepository;
