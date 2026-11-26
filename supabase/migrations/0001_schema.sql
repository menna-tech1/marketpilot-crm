-- MarketPilot AI — core schema
-- Column names follow the frozen contract in the project plan (§5).

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  client_id     uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name  text not null,
  industry      text,
  contact_email text,
  status        text not null default 'active'
                check (status in ('active', 'paused', 'churned')),
  created_at    timestamptz not null default now()
);

create index if not exists clients_owner_idx on public.clients (owner_id);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  campaign_id   uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (client_id) on delete cascade,
  campaign_name text not null,
  platform      text not null default 'Google'
                check (platform in ('Google', 'Meta', 'LinkedIn', 'TikTok', 'Email')),
  budget        numeric(12, 2) not null default 0 check (budget >= 0),
  start_date    date,
  end_date      date,
  status        text not null default 'active'
                check (status in ('active', 'paused', 'completed')),
  created_at    timestamptz not null default now(),
  constraint campaigns_dates_ok check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists campaigns_client_idx on public.campaigns (client_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  lead_id       uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (client_id) on delete cascade,
  campaign_id   uuid references public.campaigns (campaign_id) on delete set null,
  name          text not null,
  email         text,
  source        text not null default 'Organic',
  budget        numeric(12, 2) not null default 0,
  lead_score    int not null default 0 check (lead_score between 0 and 100),
  lead_category text not null default 'Cold'
                check (lead_category in ('Hot', 'Warm', 'Cold')),
  status        text not null default 'new'
                check (status in ('new', 'contacted', 'qualified', 'lost')),
  created_at    timestamptz not null default now()
);

create index if not exists leads_client_idx on public.leads (client_id);
create index if not exists leads_campaign_idx on public.leads (campaign_id);
create index if not exists leads_score_idx on public.leads (lead_score desc);

-- ---------------------------------------------------------------------------
-- campaign_metrics (daily grain)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_metrics (
  metric_id       uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns (campaign_id) on delete cascade,
  metric_date     date not null,
  impressions     bigint not null default 0,
  clicks          bigint not null default 0,
  spend           numeric(12, 2) not null default 0,
  leads_generated int not null default 0,
  conversions     int not null default 0,
  revenue         numeric(12, 2) not null default 0,
  unique (campaign_id, metric_date)
);

create index if not exists campaign_metrics_campaign_idx on public.campaign_metrics (campaign_id, metric_date);

-- ---------------------------------------------------------------------------
-- documents + chunks (RAG)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  document_id  uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (client_id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  status       text not null default 'queued'
               check (status in ('queued', 'processing', 'ready', 'failed')),
  chunk_count  int not null default 0,
  error        text,
  created_at   timestamptz not null default now()
);

create index if not exists documents_client_idx on public.documents (client_id);

create table if not exists public.document_chunks (
  chunk_id    uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (document_id) on delete cascade,
  client_id   uuid not null references public.clients (client_id) on delete cascade,
  chunk_text  text not null,
  chunk_index int not null default 0,
  embedding   vector(768)
);

create index if not exists document_chunks_document_idx on public.document_chunks (document_id);
create index if not exists document_chunks_client_idx on public.document_chunks (client_id);
