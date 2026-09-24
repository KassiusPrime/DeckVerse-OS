-- Reproducible Storage configuration for Acervo imports.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'cards-images','cards-images',true,2097152,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists acervo_admin_insert_card_images on storage.objects;
create policy acervo_admin_insert_card_images
on storage.objects for insert to authenticated
with check (bucket_id='cards-images' and app_private.is_admin());

drop policy if exists acervo_admin_update_card_images on storage.objects;
create policy acervo_admin_update_card_images
on storage.objects for update to authenticated
using (bucket_id='cards-images' and app_private.is_admin())
with check (bucket_id='cards-images' and app_private.is_admin());

drop policy if exists acervo_admin_delete_card_images on storage.objects;
create policy acervo_admin_delete_card_images
on storage.objects for delete to authenticated
using (bucket_id='cards-images' and app_private.is_admin());

drop policy if exists acervo_public_read_card_images on storage.objects;
create policy acervo_public_read_card_images
on storage.objects for select to anon,authenticated
using (bucket_id='cards-images');