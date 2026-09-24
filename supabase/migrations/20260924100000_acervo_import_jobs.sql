-- Durable, resumable Acervo imports.
create table if not exists public.acervo_import_jobs (
  id uuid primary key default gen_random_uuid(),
  collection_id text not null references public.collections(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','paused','partial','completed','failed')),
  total_entries integer not null default 0,
  total_images integer not null default 0,
  processed_images integer not null default 0,
  completed_images integer not null default 0,
  failed_images integer not null default 0,
  error_message text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.acervo_import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.acervo_import_jobs(id) on delete cascade,
  source_name text not null,
  entry_id text,
  entry_slug text,
  entity_type text not null default 'character',
  storage_path text,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','skipped')),
  checksum_sha256 text,
  mime_type text,
  byte_size bigint,
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(job_id, source_name)
);

create index if not exists acervo_import_jobs_collection_updated_idx on public.acervo_import_jobs(collection_id, updated_at desc);
create index if not exists acervo_import_items_job_status_idx on public.acervo_import_items(job_id, status, id);

alter table public.acervo_import_jobs enable row level security;
alter table public.acervo_import_items enable row level security;

drop policy if exists acervo_import_jobs_admin_select on public.acervo_import_jobs;
create policy acervo_import_jobs_admin_select on public.acervo_import_jobs for select to authenticated using (app_private.is_admin());
drop policy if exists acervo_import_items_admin_select on public.acervo_import_items;
create policy acervo_import_items_admin_select on public.acervo_import_items for select to authenticated using (app_private.is_admin());

create or replace function public.admin_create_acervo_import_job(p_collection_id text,p_total_entries integer default 0,p_images jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to ''
as $job$
declare actor uuid:=auth.uid(); job_id uuid; item jsonb; item_count integer:=0;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 if not exists(select 1 from public.collections where id=upper(trim(p_collection_id))) then raise exception 'COLLECTION_NOT_FOUND'; end if;
 if jsonb_typeof(p_images)<>'array' then raise exception 'IMAGES_MUST_BE_ARRAY'; end if;
 insert into public.acervo_import_jobs(collection_id,total_entries,total_images,created_by)
 values(upper(trim(p_collection_id)),greatest(coalesce(p_total_entries,0),0),jsonb_array_length(p_images),actor) returning id into job_id;
 for item in select * from jsonb_array_elements(p_images) loop
  insert into public.acervo_import_items(job_id,source_name,entry_id,entry_slug,entity_type,storage_path,mime_type,byte_size)
  values(job_id,trim(coalesce(item->>'source_name','')),nullif(trim(coalesce(item->>'entry_id','')),''),nullif(trim(coalesce(item->>'entry_slug','')),''),
    lower(coalesce(item->>'entity_type','character')),nullif(trim(coalesce(item->>'storage_path','')),''),nullif(trim(coalesce(item->>'mime_type','')),''),nullif(item->>'byte_size','')::bigint)
  on conflict(job_id,source_name) do update set entry_id=excluded.entry_id,entry_slug=excluded.entry_slug,entity_type=excluded.entity_type,storage_path=excluded.storage_path,mime_type=excluded.mime_type,byte_size=excluded.byte_size,updated_at=now();
  item_count:=item_count+1;
 end loop;
 update public.acervo_import_jobs set total_images=item_count,updated_at=now() where id=job_id;
 insert into public.admin_audit_log(actor_profile_id,action,payload) values(actor,'acervo.import.job.created',jsonb_build_object('job_id',job_id,'collection_id',upper(trim(p_collection_id)),'total_entries',p_total_entries,'total_images',item_count));
 return jsonb_build_object('ok',true,'job_id',job_id,'total_images',item_count);
end;$job$;

create or replace function public.admin_list_acervo_import_jobs(p_limit integer default 20)
returns jsonb language plpgsql security definer set search_path to ''
as $jobs$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select coalesce(jsonb_agg(row_to_json(x) order by x.updated_at desc),'[]'::jsonb) into result from (
  select j.id,j.collection_id,j.status,j.total_entries,j.total_images,j.processed_images,j.completed_images,j.failed_images,j.error_message,j.created_at,j.updated_at,j.completed_at,
    (select count(*) from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','failed')) as pending_images
  from public.acervo_import_jobs j where j.created_by=actor order by j.updated_at desc limit greatest(1,least(coalesce(p_limit,20),100))
 ) x;
 return result;
end;$jobs$;

create or replace function public.admin_get_acervo_import_job(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $get$
declare actor uuid:=auth.uid(); job jsonb; items jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select row_to_json(x)::jsonb into job from (select j.*,(select count(*) from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','failed')) as pending_images from public.acervo_import_jobs j where j.id=p_job_id and j.created_by=actor) x;
 if job is null then raise exception 'JOB_NOT_FOUND'; end if;
 select coalesce(jsonb_agg(row_to_json(i) order by i.id),'[]'::jsonb) into items from (select id,source_name,entry_id,entry_slug,entity_type,storage_path,status,checksum_sha256,mime_type,byte_size,error_message,attempts,created_at,updated_at,completed_at from public.acervo_import_items where job_id=p_job_id) i;
 return jsonb_build_object('job',job,'items',items);
end;$get$;

create or replace function public.admin_claim_acervo_import_item(p_job_id uuid,p_item_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $claim$
declare actor uuid:=auth.uid(); item jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 update public.acervo_import_jobs set status='running',updated_at=now() where id=p_job_id and created_by=actor and status in ('pending','paused','partial','failed');
 update public.acervo_import_items set status='processing',attempts=attempts+1,updated_at=now(),error_message=null where id=p_item_id and job_id=p_job_id and status in ('pending','failed','processing');
 select row_to_json(i)::jsonb into item from public.acervo_import_items i where i.id=p_item_id and i.job_id=p_job_id;
 if item is null then raise exception 'IMPORT_ITEM_NOT_FOUND'; end if;
 return item;
end;$claim$;

create or replace function public.admin_finish_acervo_import_item(p_job_id uuid,p_item_id uuid,p_status text,p_error text default null,p_checksum text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $finish$
declare actor uuid:=auth.uid(); next_status text;
begin
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 if not app_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 next_status:=lower(trim(p_status));
 if next_status not in ('completed','failed','skipped') then raise exception 'INVALID_ITEM_STATUS'; end if;
 update public.acervo_import_items set status=next_status,error_message=nullif(p_error,''),checksum_sha256=coalesce(nullif(p_checksum,''),checksum_sha256),completed_at=case when next_status in ('completed','skipped') then now() else null end,updated_at=now() where id=p_item_id and job_id=p_job_id;
 if not found then raise exception 'IMPORT_ITEM_NOT_FOUND'; end if;
 update public.acervo_import_jobs j set
  processed_images=(select count(*) from public.acervo_import_items i where i.job_id=j.id and i.status in ('completed','failed','skipped')),
  completed_images=(select count(*) from public.acervo_import_items i where i.job_id=j.id and i.status in ('completed','skipped')),
  failed_images=(select count(*) from public.acervo_import_items i where i.job_id=j.id and i.status='failed'),
  status=case when exists(select 1 from public.acervo_import_items i where i.job_id=j.id and i.status='processing') then 'running' when exists(select 1 from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','failed')) then 'partial' else 'completed' end,
  error_message=case when next_status='failed' then nullif(p_error,'') else j.error_message end,updated_at=now(),
  completed_at=case when not exists(select 1 from public.acervo_import_items i where i.job_id=j.id and i.status in ('pending','processing','failed')) then now() else null end
 where j.id=p_job_id and j.created_by=actor;
 return public.admin_get_acervo_import_job(p_job_id);
end;$finish$;

revoke execute on function public.admin_create_acervo_import_job(text,integer,jsonb) from public,anon;
revoke execute on function public.admin_list_acervo_import_jobs(integer) from public,anon;
revoke execute on function public.admin_get_acervo_import_job(uuid) from public,anon;
revoke execute on function public.admin_claim_acervo_import_item(uuid,uuid) from public,anon;
revoke execute on function public.admin_finish_acervo_import_item(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.admin_create_acervo_import_job(text,integer,jsonb) to authenticated;
grant execute on function public.admin_list_acervo_import_jobs(integer) to authenticated;
grant execute on function public.admin_get_acervo_import_job(uuid) to authenticated;
grant execute on function public.admin_claim_acervo_import_item(uuid,uuid) to authenticated;
grant execute on function public.admin_finish_acervo_import_item(uuid,uuid,text,text,text) to authenticated;