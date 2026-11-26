"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { deleteDocument, registerDocument, retryIngestion } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/client";
import type { ClientRow, DocumentRow } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Select } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { formatDate } from "@/lib/utils";

type DocumentWithUrl = DocumentRow & { downloadUrl: string | null };

export function DocumentsSection({
  documents,
  clients,
}: {
  documents: DocumentWithUrl[];
  clients: ClientRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.client_id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function upload() {
    if (!clientId) return setError("Select a client.");
    if (!file) return setError("Choose a PDF, TXT, MD or DOCX file.");
    if (file.size > 20 * 1024 * 1024) return setError("Files must be 20 MB or smaller.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${clientId}/${Date.now()}-${safeName}`;

    startTransition(async () => {
      setError(null);
      setNotice(null);

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const result = await registerDocument({
        clientId,
        fileName: file.name,
        storagePath: path,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setNotice(result.warning ?? null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setOpen(false);
      router.refresh();
    });
  }

  const columns: Column<DocumentWithUrl>[] = [
    {
      key: "file",
      header: "Document",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-slate-900">{row.file_name}</p>
            <p className="text-xs text-slate-400">{row.clients?.company_name ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Ingestion",
      cell: (row) => (
        <div>
          <StatusBadge status={row.status} />
          {row.error ? (
            <p className="mt-1 max-w-[220px] truncate text-xs text-rose-500" title={row.error}>
              {row.error}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "chunks",
      header: "Chunks",
      cell: (row) => <span className="text-slate-600">{row.chunk_count}</span>,
    },
    {
      key: "created",
      header: "Uploaded",
      cell: (row) => <span className="text-slate-500">{formatDate(row.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.downloadUrl ? (
            <a
              href={row.downloadUrl}
              target="_blank"
              rel="noreferrer"
              title="Download"
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
          <button
            type="button"
            title="Retry ingestion"
            onClick={() => {
              startTransition(async () => {
                const result = await retryIngestion(row.document_id);
                if (!result.ok) setError(result.error);
                else setNotice("Ingestion triggered.");
                router.refresh();
              });
            }}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <ConfirmDelete
            title="Delete document"
            onConfirm={async () => {
              const result = await deleteDocument(row.document_id, row.storage_path);
              if (!result.ok) setError(result.error);
              router.refresh();
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</div>
      ) : null}

      <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
        <span className="font-medium">Ingestion pipeline:</span> file → Supabase Storage (private) →
        WF-03 chunking + Gemini embeddings → <code className="rounded bg-white/70 px-1">document_chunks</code>{" "}
        → available to the RAG agent.
      </div>

      <DataTable
        rows={documents}
        columns={columns}
        rowKey={(row) => row.document_id}
        searchText={(row) => `${row.file_name} ${row.clients?.company_name ?? ""} ${row.status}`}
        searchPlaceholder="Search documents…"
        toolbar={
          <Button size="sm" onClick={() => setOpen(true)} disabled={clients.length === 0}>
            <UploadCloud className="h-4 w-4" /> Upload
          </Button>
        }
        emptyTitle="No documents yet"
        emptyDescription="Upload brand guidelines or campaign briefs so the AI assistant can cite them."
        emptyAction={
          <Button size="sm" onClick={() => setOpen(true)} disabled={clients.length === 0}>
            <UploadCloud className="h-4 w-4" /> Upload document
          </Button>
        }
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Upload document"
        description="PDF, TXT, Markdown or DOCX up to 20 MB."
      >
        <div className="space-y-4">
          <Field label="Client" htmlFor="doc_client" required>
            <Select
              id="doc_client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.company_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="File" htmlFor="doc_file" required>
            <label
              htmlFor="doc_file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
            >
              <UploadCloud className="h-6 w-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {file ? file.name : "Click to choose a file"}
              </span>
              <span className="text-xs text-slate-400">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 20 MB"}
              </span>
              <input
                ref={inputRef}
                id="doc_file"
                type="file"
                accept=".pdf,.txt,.md,.docx"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </Field>

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={upload} loading={pending} disabled={!file}>
              Upload & ingest
            </Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
