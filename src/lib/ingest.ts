import type { SupabaseClient } from "@supabase/supabase-js";
import { n8nIngestionWebhookUrl, n8nWebhookSecret } from "@/lib/env";

export type IngestResult = {
  sent: boolean;
  reason?: string;
  documentId: string;
};

/**
 * Notifies n8n (WF-03) that a document is ready for ingestion.
 * Sends a short-lived signed URL so the workflow can download the file
 * without ever holding a service_role key.
 */
export async function triggerIngestion(
  supabase: SupabaseClient,
  document: {
    document_id: string;
    client_id: string;
    file_name: string;
    storage_path: string;
  },
): Promise<IngestResult> {
  if (!n8nIngestionWebhookUrl) {
    return { sent: false, reason: "N8N_INGESTION_WEBHOOK_URL is not configured", documentId: document.document_id };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, 60 * 30);

  if (signError || !signed?.signedUrl) {
    return { sent: false, reason: signError?.message ?? "Could not sign file URL", documentId: document.document_id };
  }

  try {
    const response = await fetch(n8nIngestionWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(n8nWebhookSecret ? { "x-webhook-secret": n8nWebhookSecret } : {}),
      },
      body: JSON.stringify({
        document_id: document.document_id,
        client_id: document.client_id,
        file_name: document.file_name,
        storage_path: document.storage_path,
        file_url: signed.signedUrl,
        source: "marketpilot-crm",
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      return { sent: false, reason: `n8n responded ${response.status}`, documentId: document.document_id };
    }

    await supabase
      .from("documents")
      .update({ status: "processing", error: null })
      .eq("document_id", document.document_id);

    return { sent: true, documentId: document.document_id };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Webhook request failed",
      documentId: document.document_id,
    };
  }
}
