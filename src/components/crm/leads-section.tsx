"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Users } from "lucide-react";
import { deleteLead, saveLead } from "@/lib/actions/leads";
import type { CampaignRow, ClientRow, LeadCategory, LeadRow } from "@/lib/types";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { formatCurrency, formatDate, scoreTone } from "@/lib/utils";

const CATEGORY_TONE: Record<LeadCategory, "red" | "amber" | "slate"> = {
  Hot: "red",
  Warm: "amber",
  Cold: "slate",
};

const SOURCES = ["LinkedIn", "Google Ads", "Meta Ads", "Referral", "Organic", "Webinar"];

export function LeadsSection({
  leads,
  clients,
  campaigns,
}: {
  leads: LeadRow[];
  clients: ClientRow[];
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | LeadCategory>("all");
  const [formClient, setFormClient] = useState<string>(clients[0]?.client_id ?? "");

  const counts = useMemo(
    () => ({
      all: leads.length,
      Hot: leads.filter((l) => l.lead_category === "Hot").length,
      Warm: leads.filter((l) => l.lead_category === "Warm").length,
      Cold: leads.filter((l) => l.lead_category === "Cold").length,
    }),
    [leads],
  );

  const visible = filter === "all" ? leads : leads.filter((l) => l.lead_category === filter);

  function show(row: LeadRow | null) {
    setEditing(row);
    setError(null);
    setFormClient(row?.client_id ?? clients[0]?.client_id ?? "");
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveLead(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const columns: Column<LeadRow>[] = [
    {
      key: "name",
      header: "Lead",
      cell: (row) => (
        <div>
          <Link href={`/crm/leads/${row.lead_id}`} className="font-medium text-slate-900 hover:text-brand-700">
            {row.name}
          </Link>
          <p className="text-xs text-slate-400">{row.email ?? "No email"}</p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (row) => <span className="text-slate-600">{row.clients?.company_name ?? "—"}</span>,
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => <span className="text-slate-500">{row.source}</span>,
    },
    {
      key: "score",
      header: "Score",
      cell: (row) => {
        const tone = scoreTone(row.lead_score);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  tone === "hot" ? "bg-rose-500" : tone === "warm" ? "bg-amber-400" : "bg-slate-300"
                }`}
                style={{ width: `${Math.max(3, row.lead_score)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-800">{row.lead_score}</span>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => <Badge tone={CATEGORY_TONE[row.lead_category]}>{row.lead_category}</Badge>,
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
            title="Edit lead"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <ConfirmDelete
            title="Delete lead"
            onConfirm={async () => {
              const result = await deleteLead(row.lead_id);
              if (!result.ok) setError(result.error);
              router.refresh();
            }}
          />
        </div>
      ),
    },
  ];

  const campaignOptions = campaigns.filter((c) => c.client_id === formClient);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "Hot", "Warm", "Cold"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
              filter === key
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {key === "all" ? "All leads" : key}
            <span className={`ml-1.5 ${filter === key ? "text-slate-300" : "text-slate-400"}`}>
              {counts[key]}
            </span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          Scores 0–100 · Hot ≥ 70 · Warm ≥ 40
        </span>
      </div>

      {error && !open ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      <DataTable
        rows={visible}
        columns={columns}
        rowKey={(row) => row.lead_id}
        searchText={(row) =>
          `${row.name} ${row.email ?? ""} ${row.source} ${row.clients?.company_name ?? ""}`
        }
        searchPlaceholder="Search leads…"
        toolbar={
          <Button size="sm" onClick={() => show(null)}>
            <Plus className="h-4 w-4" /> New lead
          </Button>
        }
        emptyTitle="No leads yet"
        emptyDescription="Leads captured from your campaigns appear here, scored by Lead Intelligence."
        emptyAction={
          <Button size="sm" onClick={() => show(null)}>
            <Users className="h-4 w-4" /> Add lead
          </Button>
        }
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit lead" : "New lead"}
        description={
          editing
            ? "Score and category are read-only — owned by Lead Intelligence (WF-05)."
            : "Capture a lead manually. Scoring runs in WF-05."
        }
      >
        <form
          key={editing?.lead_id ?? "new"}
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-4"
        >
          {editing ? <input type="hidden" name="lead_id" value={editing.lead_id} /> : null}

          <Field label="Client" htmlFor="client_id" required>
            <Select
              id="client_id"
              name="client_id"
              value={formClient}
              onChange={(event) => setFormClient(event.target.value)}
              required
            >
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.company_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Campaign" htmlFor="campaign_id" hint="Optional — attribute the lead to a campaign.">
            <Select
              id="campaign_id"
              name="campaign_id"
              defaultValue={editing?.campaign_id ?? ""}
              key={`${formClient}-${editing?.lead_id ?? "new"}`}
            >
              <option value="">No campaign</option>
              {campaignOptions.map((campaign) => (
                <option key={campaign.campaign_id} value={campaign.campaign_id}>
                  {campaign.campaign_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="John Smith" required />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                placeholder="john@company.com"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source" htmlFor="source">
              <Select id="source" name="source" defaultValue={editing?.source ?? "LinkedIn"}>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
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
                defaultValue={editing?.budget ?? 0}
              />
            </Field>
          </div>

          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={editing?.status ?? "new"}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
            </Select>
          </Field>

          {editing ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              Current score:{" "}
              <span className="font-semibold text-slate-700">{editing.lead_score}/100</span> ·{" "}
              {editing.lead_category} · est. budget {formatCurrency(editing.budget)}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : "Create lead"}
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
