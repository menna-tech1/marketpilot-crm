import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { n8nWebhookSecret } from "@/lib/env";

const ALLOWED = new Set(["queued", "processing", "ready", "failed"]);

/**
 * Callback used by n8n (WF-03) when ingestion finishes.
 * Requires the shared secret header and the service role key.
 */
export async function POST(request: Request) {
  if (!n8nWebhookSecret || request.headers.get("x-webhook-secret") !== n8nWebhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  let body: { document_id?: string; status?: string; chunk_count?: number; error?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.document_id || !body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "document_id and a valid status are required" }, { status: 400 });
  }

  const { error } = await admin
    .from("documents")
    .update({
      status: body.status,
      chunk_count: typeof body.chunk_count === "number" ? body.chunk_count : undefined,
      error: body.error ?? null,
    })
    .eq("document_id", body.document_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "success", document_id: body.document_id });
}
