"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Plus } from "lucide-react";
import { deleteClient, saveClient } from "@/lib/actions/crm";
import type { ClientRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, initials } from "@/lib/utils";

export function ClientsSection({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show(row: ClientRow | null) {
    setEditing(row);
    setError(null);
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveClient(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const columns: Column<ClientRow>[] = [
    {
      key: "company",
      header: "Company",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            {initials(row.company_name)}
          </span>
          <div>
            <p className="font-medium text-slate-900">{row.company_name}</p>
            <p className="text-xs text-slate-400">{row.industry ?? "No industry"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (row) => <span className="text-slate-600">{row.contact_email ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "created",
      header: "Added",
      cell: (row) => <span className="text-slate-500">{formatDate(row.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => show(row)}
            title="Edit client"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ConfirmDelete
            title="Delete client"
            onConfirm={async () => {
              const result = await deleteClient(row.client_id);
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
      {error && !open ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      <DataTable
        rows={clients}
        columns={columns}
        rowKey={(row) => row.client_id}
        searchText={(row) => `${row.company_name} ${row.industry ?? ""} ${row.contact_email ?? ""}`}
        searchPlaceholder="Search clients…"
        toolbar={
          <Button size="sm" onClick={() => show(null)}>
            <Plus className="h-4 w-4" /> New client
          </Button>
        }
        emptyTitle="No clients yet"
        emptyDescription="Add your first client to start creating campaigns and capturing leads."
        emptyAction={
          <Button size="sm" onClick={() => show(null)}>
            <Building2 className="h-4 w-4" /> Add client
          </Button>
        }
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit client" : "New client"}
        description={editing ? editing.company_name : "Create a client workspace."}
      >
        <form
          key={editing?.client_id ?? "new"}
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-4"
        >
          {editing ? <input type="hidden" name="client_id" value={editing.client_id} /> : null}

          <Field label="Company name" htmlFor="company_name" required>
            <Input
              id="company_name"
              name="company_name"
              defaultValue={editing?.company_name ?? ""}
              placeholder="Northwind Retail"
              required
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry" htmlFor="industry">
              <Input
                id="industry"
                name="industry"
                defaultValue={editing?.industry ?? ""}
                placeholder="Retail"
              />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={editing?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </Select>
            </Field>
          </div>

          <Field label="Contact email" htmlFor="contact_email">
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={editing?.contact_email ?? ""}
              placeholder="marketing@company.com"
            />
          </Field>

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : "Create client"}
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
