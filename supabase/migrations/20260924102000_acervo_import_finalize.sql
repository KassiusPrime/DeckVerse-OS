-- Harden resumable import claiming and allow metadata-only imports to close cleanly.
create or replace function public.admin_claim_acervo_import_item(p_job_id uuid,p_item_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $claim$
declare actor uuid:=auth.uid(); item jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.acervo_import_jobs set status='running',updated_at=now()
 where id=p_job_id and created_by=actor and status in ('pending','paused','partial','failed');
 update public.acervo_import_items
 set status='processing',attempts=attempts+1,updated_at=now(),error_message=null
 where id=p_item_id and job_id=p_job_id
   and (status in ('pending','failed') or (status='processing' and updated_at < now() - interval '5 minutes'));
 select row_to_json(i)::jsonb into item from public.acervo_import_items i
 where i.id=p_item_id and i.job_id=p_job_id and i.status='processing';
 if item is null then raise exception 'IMPORT_ITEM_BUSY_OR_NOT_FOUND'; end if;
 return item;
end;$claim$;

create or replace function public.admin_finalize_acervo_import_job(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $final$
declare actor uuid:=auth.uid(); job jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.acervo_import_jobs j set
   status=case when exists(select 1 from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','processing','failed')) then 'partial' else 'completed' end,
   updated_at=now(),
   completed_at=case when not exists(select 1 from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','processing','failed')) then now() else null end
 where j.id=p_job_id and j.created_by=actor;
 if not found then raise exception 'JOB_NOT_FOUND'; end if;
 select public.admin_get_acervo_import_job(p_job_id) into job;
 return job;
end;$final$;

revoke execute on function public.admin_finalize_acervo_import_job(uuid) from public,anon;
grant execute on function public.admin_finalize_acervo_import_job(uuid) to authenticated;