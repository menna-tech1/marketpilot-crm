"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { deleteCampaign, saveCampaign } from "@/lib/actions/crm";
import type { CampaignRow, ClientRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const PLATFORMS = ["Google", "Meta", "LinkedIn", "TikTok", "Email"];

export function CampaignsSection({
  campaigns,
  clients,
}: {
  campaigns: CampaignRow[];
  clients: ClientRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show(row: CampaignRow | null) {
    setEditing(row);
    setError(null);
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveCampaign(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (clients.length === 0) {
    return (
      <div className="card-base p-8">
        <h2 className="text-lg font-semibold text-slate-900">Add a client first</h2>
        <p className="mt-1 max-w-lg text-sm text-slate-500">
          Every campaign belongs to a client. Create one client, then come back to plan campaigns.
        </p>
        <Link
          href="/crm/clients"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Go to clients
        </Link>
      </div>
    );
  }

  const columns: Column<CampaignRow>[] = [
    {
      key: "campaign",
      header: "Campaign",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.campaign_name}</p>
          <p className="text-xs text-slate-400">{row.platform}</p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (row) => <span className="text-slate-600">{row.clients?.company_name ?? "—"}</span>,
    },
    {
      key: "budget",
      header: "Budget",
      cell: (row) => <span className="font-medium text-slate-800">{formatCurrency(row.budget)}</span>,
    },
    {
      key: "dates",
      header: "Flight",
      cell: (row) => (
        <span className="text-slate-500">
          {formatDate(row.start_date)} → {row.end_date ? formatDate(row.end_date) : "open"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
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
            title="Edit campaign"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ConfirmDelete
            title="Delete campaign"
            onConfirm={async () => {
              const result = await deleteCampaign(row.campaign_id);
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
        rows={campaigns}
        columns={columns}
        rowKey={(row) => row.campaign_id}
        searchText={(row) =>
          `${row.campaign_name} ${row.platform} ${row.status} ${row.clients?.company_name ?? ""}`
        }
        searchPlaceholder="Search campaigns…"
        toolbar={
          <Button size="sm" onClick={() => show(null)}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
        emptyTitle="No campaigns yet"
        emptyDescription="Plan a campaign with a budget and flight dates, then track its performance."
        emptyAction={
          <Button size="sm" onClick={() => show(null)}>
            <Megaphone className="h-4 w-4" /> Create campaign
          </Button>
        }
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit campaign" : "New campaign"}
        description={editing ? editing.campaign_name : "Plan a campaign for one of your clients."}
      >
        <form
          key={editing?.campaign_id ?? "new"}
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-4"
        >
          {editing ? <input type="hidden" name="campaign_id" value={editing.campaign_id} /> : null}

          <Field label="Client" htmlFor="client_id" required>
            <Select id="client_id" name="client_id" defaultValue={editing?.client_id ?? clients[0].client_id} required>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.company_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Campaign name" htmlFor="campaign_name" required>
            <Input
              id="campaign_name"
              name="campaign_name"
              defaultValue={editing?.campaign_name ?? ""}
              placeholder="Q3 Prospecting"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform" htmlFor="platform">
              <Select id="platform" name="platform" defaultValue={editing?.platform ?? "Google"}>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Budget (USD)" htmlFor="budget">
              <Input
                id="budget"
                name="budget"
                type="number"
                min={0}
                step={100}
                defaultValue={editing?.budget ?? 5000}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="start_date">
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={editing?.start_date ?? ""}
              />
            </Field>
            <Field label="End date" htmlFor="end_date" hint="Leave empty for an open-ended flight.">
              <Input id="end_date" name="end_date" type="date" defaultValue={editing?.end_date ?? ""} />
            </Field>
          </div>

          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={editing?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
