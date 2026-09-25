-- Harden resumable Acervo imports: append new ZIP items and explicitly close failed jobs.
create or replace function public.admin_append_acervo_import_items(p_job_id uuid,p_images jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to ''
as $append$
declare actor uuid:=auth.uid(); added integer:=0; item jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if not exists(select 1 from public.acervo_import_jobs where id=p_job_id and created_by=actor) then raise exception 'JOB_NOT_FOUND'; end if;
 if exists(select 1 from public.acervo_import_jobs where id=p_job_id and status='completed') then raise exception 'JOB_ALREADY_COMPLETED'; end if;
 for item in select * from jsonb_array_elements(coalesce(p_images,'[]'::jsonb)) loop
   insert into public.acervo_import_items(job_id,source_name,entry_id,entry_slug,entity_type,storage_path,status,mime_type,byte_size)
   values (p_job_id,nullif(item->>'source_name',''),nullif(item->>'entry_id',''),nullif(item->>'entry_slug',''),nullif(item->>'entity_type',''),nullif(item->>'storage_path',''),'pending',nullif(item->>'mime_type',''),nullif(item->>'byte_size','')::bigint)
   on conflict (job_id,source_name) do update
     set entry_id=excluded.entry_id,entry_slug=excluded.entry_slug,entity_type=excluded.entity_type,storage_path=excluded.storage_path,mime_type=excluded.mime_type,byte_size=coalesce(excluded.byte_size,public.acervo_import_items.byte_size),updated_at=now()
     where public.acervo_import_items.status in ('pending','failed','skipped');
   if found then added:=added+1; end if;
 end loop;
 update public.acervo_import_jobs
 set total_images=(select count(*) from public.acervo_import_items where job_id=p_job_id),
     total_entries=greatest(total_entries,(select count(distinct entry_slug) from public.acervo_import_items where job_id=p_job_id)),
     status=case when status in ('partial','failed','paused') then 'pending' else status end,
     updated_at=now()
 where id=p_job_id and created_by=actor;
 return jsonb_build_object('ok',true,'added',added);
end;$append$;

create or replace function public.admin_set_acervo_import_job_status(p_job_id uuid,p_status text,p_error text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $status$
declare actor uuid:=auth.uid(); job jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if p_status not in ('pending','running','paused','partial','completed','failed') then raise exception 'INVALID_STATUS'; end if;
 update public.acervo_import_jobs set status=p_status,error_message=nullif(p_error,''),updated_at=now(),completed_at=case when p_status in ('completed','failed') then now() else null end
 where id=p_job_id and created_by=actor;
 if not found then raise exception 'JOB_NOT_FOUND'; end if;
 select public.admin_get_acervo_import_job(p_job_id) into job;
 return job;
end;$status$;

revoke execute on function public.admin_append_acervo_import_items(uuid,jsonb) from public,anon;
grant execute on function public.admin_append_acervo_import_items(uuid,jsonb) to authenticated;
revoke execute on function public.admin_set_acervo_import_job_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_acervo_import_job_status(uuid,text,text) to authenticated;
