"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/actions/helpers";
import { triggerIngestion } from "@/lib/ingest";
import type { ActionResult } from "@/lib/types";

export async function registerDocument(input: {
  clientId: string;
  fileName: string;
  storagePath: string;
}): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  if (!input.clientId || !input.storagePath.startsWith(`${input.clientId}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      client_id: input.clientId,
      file_name: input.fileName,
      storage_path: input.storagePath,
      status: "queued",
    })
    .select("document_id, client_id, file_name, storage_path")
    .single();

  if (insertError || !document) {
    return { ok: false, error: insertError?.message ?? "Could not register document." };
  }

  const ingest = await triggerIngestion(supabase, document);

  revalidatePath("/crm/documents");
  return {
    ok: true,
    warning: ingest.sent ? undefined : `Saved, but ingestion was not triggered: ${ingest.reason}`,
  };
}

export async function retryIngestion(documentId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { data: document, error: readError } = await supabase
    .from("documents")
    .select("document_id, client_id, file_name, storage_path")
    .eq("document_id", documentId)
    .single();

  if (readError || !document) return { ok: false, error: "Document not found." };

  const ingest = await triggerIngestion(supabase, document);
  revalidatePath("/crm/documents");

  return ingest.sent
    ? { ok: true }
    : { ok: false, error: `Could not trigger ingestion: ${ingest.reason}` };
}

export async function deleteDocument(documentId: string, storagePath: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { error: storageError } = await supabase.storage.from("documents").remove([storagePath]);
  // A missing object is not fatal — remove the database row either way.
  if (storageError && !storageError.message.toLowerCase().includes("not found")) {
    return { ok: false, error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("document_id", documentId);

  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/crm/documents");
  return { ok: true };
}
