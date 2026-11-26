# MarketPilot AI — CRM & Platform

Role 6 deliverable: CRM pages, Supabase auth/RLS/storage, document ingestion and the
GitHub → Vercel deployment.

## Stack

Next.js 15 (App Router, Server Actions) · Tailwind CSS · Supabase (Postgres + Auth + Storage + RLS) · n8n · Gemini

## What is included

| Area | Status |
| --- | --- |
| Clients / Campaigns / Leads CRUD | ✅ |
| Lead detail with `lead_score` + `lead_category` (read-only, WF-05 owns them) | ✅ |
| Documents: upload → private Storage → WF-03 ingestion webhook | ✅ |
| Supabase Auth (email + password, email confirmation callback) | ✅ |
| RLS on all tables + Storage policies, ownership chain | ✅ |
| KPI view `v_campaign_kpis` (ROAS, CPL, CTR) | ✅ |
| AI chat proxy to WF-01 with mock fallback | ✅ |
| Demo data generator (10 clients / 25 campaigns / 500 leads / ~3k metric rows) | ✅ |
| Ingestion status callback for n8n (`/api/ingest/callback`) | ✅ |

Dashboard, analytics and chat **UI** belong to the Frontend Lead — the pages here are a working
baseline so the flows can be demoed end-to-end.

## Local setup

```bash
npm install
cp .env.example .env.local     # fill in Supabase + n8n values
npm run dev                    # http://localhost:3000
```

### 1. Supabase

Create a project, then run the migrations **in order** in the SQL editor (or `supabase db push`):

1. `supabase/migrations/0001_schema.sql` — tables, indexes, pgvector
2. `supabase/migrations/0002_rls.sql` — RLS, storage bucket + policies, guardrail triggers
3. `supabase/migrations/0003_seed.sql` — `seed_demo_data()` function
4. `supabase/migrations/0004_views.sql` — `v_campaign_kpis` view

For the demo, disable **Authentication → Providers → Email → Confirm email** so a new account can
sign in immediately.

### 2. Demo data

Sign in, then press **Load demo data** on the empty dashboard (or call
`supabase.rpc('seed_demo_data', { p_reset: true })`). Data is created under the signed-in user and
is protected by RLS.

### 3. n8n

| Variable | Used by |
| --- | --- |
| `N8N_INGESTION_WEBHOOK_URL` | `POST` on every upload (WF-03) |
| `ORCHESTRATOR_WEBHOOK_URL` | `POST /api/chat` (WF-01) |
| `N8N_WEBHOOK_SECRET` | `x-webhook-secret` header, both directions |

The ingestion call sends `document_id`, `client_id`, `file_name`, `storage_path`, `file_url`
(30-minute signed URL). When WF-03 finishes it should call:

```
POST /api/ingest/callback
x-webhook-secret: <N8N_WEBHOOK_SECRET>
{ "document_id": "...", "status": "ready", "chunk_count": 42, "error": null }
```

## Security model

- Every `clients` row has `owner_id = auth.uid()`. Campaigns, leads, documents and chunks are
  reachable only through `owns_client()` / `owns_campaign()` (SECURITY DEFINER helpers).
- A second user sees **zero rows** — verify before the demo.
- `lead_score` / `lead_category` cannot be changed by authenticated users (trigger). WF-05 must
  use the service role.
- Storage bucket `documents` is private; objects live under `{client_id}/...` and policies check
  ownership. Downloads use short-lived signed URLs.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in `/api/ingest/callback`. It is never exposed to the
  client bundle.

## Deploy (GitHub → Vercel)

1. `git init && git add . && git commit -m "feat: marketpilot crm"` and push to GitHub.
2. Import the repo in Vercel (framework auto-detected).
3. Add environment variables for **Production** and **Preview**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `N8N_INGESTION_WEBHOOK_URL`, `ORCHESTRATOR_WEBHOOK_URL`,
   `N8N_WEBHOOK_SECRET`.
4. Add the Vercel domain to Supabase **Authentication → URL Configuration** (Site URL + redirect
   `https://<domain>/auth/callback`).
5. Allow the Vercel domain in the n8n webhook CORS/allowlist if the workflow validates origins.
6. Smoke-test: sign in → create client → campaign → lead → upload PDF → chat.

## Demo script (4 flows)

1. **Business overview** — dashboard KPIs, top campaigns by ROAS.
2. **AI analytics** — `/chat`: “Which campaign performed best last month?” → SQL agent answer.
3. **Knowledge** — upload brand guidelines → status becomes `ready` → ask a brand question.
4. **Lead intelligence** — open a Hot lead → score ring, category, status change.

## Project structure

```
src/app/(app)/dashboard      overview KPIs
src/app/(app)/crm/clients    clients CRUD
src/app/(app)/crm/campaigns  campaigns CRUD
src/app/(app)/crm/leads      leads list + detail
src/app/(app)/crm/documents  upload + ingestion status
src/app/(app)/chat           AI assistant
src/app/api/chat             WF-01 proxy
src/app/api/ingest           manual re-trigger
src/app/api/ingest/callback  n8n → CRM status
src/lib/actions              server actions (auth, CRM, documents, demo)
src/lib/supabase             browser / server / admin / middleware clients
supabase/migrations          schema, RLS, seed, views
docs/contracts.md            JSON contracts shared with the AI/RAG leads
```
