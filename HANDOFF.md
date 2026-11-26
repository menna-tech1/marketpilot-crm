# Handoff — CRM & Platform (3-day track)

Everything in this repo is built and verified except the steps that need your Supabase,
n8n and Vercel accounts. Follow the sequence below; it takes about 45 minutes.

## What is already done

- 6 CRM pages: clients, campaigns, leads, lead detail, documents, plus dashboard and AI chat.
- Full CRUD through Server Actions, protected by Supabase Auth (email + password).
- Schema for all 6 tables, RLS on every table, storage policies, guardrail triggers.
- Document upload → private bucket → WF-03 webhook, status tracking + n8n callback endpoint.
- `v_campaign_kpis` view (ROAS, CPL, CTR) and a one-click demo dataset.
- Production build passes; 22 SQL checks pass (`npm run validate:sql`).
- Client bundles contain no service-role key.

## Go-live sequence

1. **Supabase** → new project. SQL editor: run `0001` → `0002` → `0003` → `0004` in order.
2. **Auth** → Providers → Email → disable “Confirm email” (demo only).
3. **.env.local** → copy `.env.example`, paste URL + anon key.
4. `npm run dev` → create an account → **Load demo data** on the dashboard.
5. **Verify isolation**: create a second account in a private window — it must see 0 clients.
6. **GitHub**: push this repo, then import it in **Vercel**.
7. **Vercel env vars** (Production + Preview):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `N8N_INGESTION_WEBHOOK_URL`,
   `ORCHESTRATOR_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`.
8. **Supabase → Auth → URL configuration**: site URL = Vercel domain, redirect
   `https://<domain>/auth/callback`.
9. Upload a real PDF, confirm status `queued → processing → ready` and chunks > 0.
10. Run the 4 demo flows on the production URL, then tag `v1.0`.

## What to collect from the other leads

| From | Needed | Why |
| --- | --- | --- |
| AI Lead | WF-01 production webhook URL | `/api/chat` |
| RAG Lead | WF-03 ingestion webhook URL + callback secret | document pipeline |
| Database Lead | confirmation that column names match §5 | already aligned in migrations |
| Frontend Lead | final dashboard/analytics/chat components | drop-in over the baseline pages |

## Verification checklist

- [ ] `npm run build` green
- [ ] `npm run validate:sql` green
- [ ] Sign-in, sign-out, session refresh after 1 hour
- [ ] CRUD on clients, campaigns, leads
- [ ] Second user sees zero rows (RLS)
- [ ] Lead score is read-only in the UI (WF-05 owns it)
- [ ] Upload → ingestion → `ready` with chunks
- [ ] Chat returns a real answer from WF-01
- [ ] No `service_role` in `.next/static`

## Known demo shortcuts (acceptable, documented)

- Documents seeded by the demo generator point to files that do not exist yet; upload real
  PDFs before the RAG demo.
- Email confirmation is disabled for the demo; re-enable it for real use.
- The dashboard is a baseline so the flows are demoable; the Frontend Lead can replace it
  without touching the data layer.
