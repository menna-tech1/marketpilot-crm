import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerIngestion } from "@/lib/ingest";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { document_id?: string };
  try {
    body = (await request.json()) as { document_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.document_id) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("document_id, client_id, file_name, storage_path")
    .eq("document_id", body.document_id)
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const result = await triggerIngestion(supabase, document);

  if (!result.sent) {
    return NextResponse.json(
      { status: "error", sent: false, reason: result.reason },
      { status: 502 },
    );
  }

  return NextResponse.json({ status: "success", sent: true, document_id: document.document_id });
}
