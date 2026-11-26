-- MarketPilot AI — row level security
-- Model: every row is reachable only through a client owned by auth.uid().
-- n8n / server jobs use the service_role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- helpers (security definer to avoid recursive policy lookups)
-- ---------------------------------------------------------------------------
create or replace function public.owns_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where client_id = p_client_id and owner_id = auth.uid()
  );
$$;

create or replace function public.owns_campaign(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns c
    join public.clients cl on cl.client_id = c.client_id
    where c.campaign_id = p_campaign_id and cl.owner_id = auth.uid()
  );
$$;

revoke all on function public.owns_client(uuid) from public;
revoke all on function public.owns_campaign(uuid) from public;
grant execute on function public.owns_client(uuid) to authenticated;
grant execute on function public.owns_campaign(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- explicit table privileges (Supabase defaults are equivalent; explicit is safer)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.clients, public.campaigns, public.leads, public.documents
  to authenticated;
grant select on public.campaign_metrics, public.document_chunks to authenticated;
grant all on public.clients, public.campaigns, public.leads, public.documents,
  public.campaign_metrics, public.document_chunks to service_role;

revoke all on public.clients, public.campaigns, public.leads, public.documents,
  public.campaign_metrics, public.document_chunks from anon;

-- ---------------------------------------------------------------------------
-- enable RLS
-- ---------------------------------------------------------------------------
alter table public.clients          enable row level security;
alter table public.campaigns        enable row level security;
alter table public.leads            enable row level security;
alter table public.campaign_metrics enable row level security;
alter table public.documents        enable row level security;
alter table public.document_chunks  enable row level security;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_select on public.clients
  for select to authenticated using (owner_id = auth.uid());

create policy clients_insert on public.clients
  for insert to authenticated with check (owner_id = auth.uid());

create policy clients_update on public.clients
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy clients_delete on public.clients
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
drop policy if exists campaigns_select on public.campaigns;
drop policy if exists campaigns_insert on public.campaigns;
drop policy if exists campaigns_update on public.campaigns;
drop policy if exists campaigns_delete on public.campaigns;

create policy campaigns_select on public.campaigns
  for select to authenticated using (public.owns_client(client_id));

create policy campaigns_insert on public.campaigns
  for insert to authenticated with check (public.owns_client(client_id));

create policy campaigns_update on public.campaigns
  for update to authenticated
  using (public.owns_client(client_id))
  with check (public.owns_client(client_id));

create policy campaigns_delete on public.campaigns
  for delete to authenticated using (public.owns_client(client_id));

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete on public.leads;

create policy leads_select on public.leads
  for select to authenticated using (public.owns_client(client_id));

create policy leads_insert on public.leads
  for insert to authenticated with check (public.owns_client(client_id));

create policy leads_update on public.leads
  for update to authenticated
  using (public.owns_client(client_id))
  with check (public.owns_client(client_id));

create policy leads_delete on public.leads
  for delete to authenticated using (public.owns_client(client_id));

-- ---------------------------------------------------------------------------
-- campaign_metrics (read-only for the app)
-- ---------------------------------------------------------------------------
drop policy if exists campaign_metrics_select on public.campaign_metrics;
create policy campaign_metrics_select on public.campaign_metrics
  for select to authenticated using (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- documents + chunks
-- ---------------------------------------------------------------------------
drop policy if exists documents_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_select on public.documents
  for select to authenticated using (public.owns_client(client_id));

create policy documents_insert on public.documents
  for insert to authenticated with check (public.owns_client(client_id) and status = 'queued');

create policy documents_update on public.documents
  for update to authenticated
  using (public.owns_client(client_id))
  with check (public.owns_client(client_id));

create policy documents_delete on public.documents
  for delete to authenticated using (public.owns_client(client_id));

drop policy if exists document_chunks_select on public.document_chunks;
create policy document_chunks_select on public.document_chunks
  for select to authenticated using (public.owns_client(client_id));

-- ---------------------------------------------------------------------------
-- integrity: a lead's campaign must belong to the same client
-- ---------------------------------------------------------------------------
create or replace function public.leads_check_campaign_client()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.campaign_id is not null then
    if not exists (
      select 1 from public.campaigns
      where campaign_id = new.campaign_id and client_id = new.client_id
    ) then
      raise exception 'campaign % does not belong to client %', new.campaign_id, new.client_id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_campaign_client_check on public.leads;
create trigger leads_campaign_client_check
  before insert or update of campaign_id, client_id on public.leads
  for each row execute function public.leads_check_campaign_client();

-- ---------------------------------------------------------------------------
-- guardrail: lead_score / lead_category are written by WF-05 (service_role) only
-- ---------------------------------------------------------------------------
create or replace function public.leads_protect_score()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and (new.lead_score is distinct from old.lead_score
          or new.lead_category is distinct from old.lead_category) then
    raise exception 'lead_score and lead_category are managed by Lead Intelligence (WF-05)'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists leads_protect_score on public.leads;
create trigger leads_protect_score
  before update on public.leads
  for each row execute function public.leads_protect_score();

-- ---------------------------------------------------------------------------
-- storage: private "documents" bucket, one folder per client
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists documents_storage_select on storage.objects;
drop policy if exists documents_storage_insert on storage.objects;
drop policy if exists documents_storage_update on storage.objects;
drop policy if exists documents_storage_delete on storage.objects;

create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.clients c
      where c.owner_id = auth.uid() and name like c.client_id::text || '/%'
    )
  );

create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.clients c
      where c.owner_id = auth.uid() and name like c.client_id::text || '/%'
    )
  );

create policy documents_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.clients c
      where c.owner_id = auth.uid() and name like c.client_id::text || '/%'
    )
  );

create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.clients c
      where c.owner_id = auth.uid() and name like c.client_id::text || '/%'
    )
  );
