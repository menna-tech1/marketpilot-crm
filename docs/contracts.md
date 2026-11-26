# Integration contracts

Frozen shapes shared with the Frontend, AI and RAG leads. Do not rename keys.

## A — Frontend → Orchestrator (WF-01)

`POST /api/chat` (Next.js) forwards to `ORCHESTRATOR_WEBHOOK_URL`.

```json
{
  "message": "Which campaign had the highest ROAS last month?",
  "conversation_id": "uuid",
  "user_id": "uuid"
}
```

## F — Orchestrator → Frontend

```json
{
  "status": "success",
  "conversation_id": "uuid",
  "response": "Campaign A achieved the highest ROAS at 4.2x.",
  "agent_used": "sql_analytics",
  "data": {},
  "sources": [],
  "error": null
}
```

`status: "error"` must still return a human-readable `response`.

## B — Orchestrator → SQL tool

```json
{
  "question": "Which campaign had the highest ROAS last month?",
  "filters": { "client_id": null, "date_from": "2026-10-01", "date_to": "2026-10-31" }
}
```

## C — Orchestrator → RAG tool

```json
{ "question": "What are the brand guidelines for Client A?", "client_id": "uuid" }
```

## D — Orchestrator → Lead tool

```json
{
  "lead": {
    "lead_id": "uuid",
    "client_id": "uuid",
    "name": "John Smith",
    "source": "LinkedIn",
    "budget": 5000
  }
}
```

## E — Any tool → Orchestrator

```json
{
  "status": "success",
  "agent": "sql_analytics",
  "response": "Campaign A achieved the highest ROAS.",
  "data": {},
  "sources": [],
  "error": null
}
```

## CRM → WF-03 (document ingestion)

`POST N8N_INGESTION_WEBHOOK_URL`

Headers: `content-type: application/json`, `x-webhook-secret: <N8N_WEBHOOK_SECRET>`

```json
{
  "document_id": "uuid",
  "client_id": "uuid",
  "file_name": "brand-guidelines.pdf",
  "storage_path": "client-uuid/1712345678-brand-guidelines.pdf",
  "file_url": "https://.../signed-url",
  "source": "marketpilot-crm"
}
```

`file_url` is a 30-minute signed URL. WF-03 downloads the file, chunks it, creates Gemini
embeddings (768 dims) and inserts `document_chunks` with the **service role** key.

## WF-03 → CRM (callback)

`POST /api/ingest/callback`

Headers: `x-webhook-secret: <N8N_WEBHOOK_SECRET>`

```json
{
  "document_id": "uuid",
  "status": "ready",
  "chunk_count": 42,
  "error": null
}
```

Allowed statuses: `queued`, `processing`, `ready`, `failed`.

## Field ownership

| Field | Owner |
| --- | --- |
| `leads.lead_score`, `leads.lead_category` | WF-05 (service role) |
| `documents.status`, `documents.chunk_count`, `documents.error` | WF-03 callback |
| `document_chunks.*` | WF-03 / RAG lead |
| everything else in `clients`, `campaigns`, `leads` | CRM (authenticated user, RLS) |
