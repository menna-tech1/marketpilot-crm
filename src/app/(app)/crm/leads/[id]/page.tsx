import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BrainCircuit, CalendarDays, Mail, Megaphone, Wallet } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LeadStatusSelect } from "@/components/crm/lead-status-select";
import { getLead } from "@/lib/queries";
import { formatCurrency, formatDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryTone = { Hot: "red", Warm: "amber", Cold: "slate" } as const;

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) notFound();

  const tone = categoryTone[lead.lead_category];
  const ring =
    lead.lead_category === "Hot"
      ? "stroke-rose-500"
      : lead.lead_category === "Warm"
        ? "stroke-amber-400"
        : "stroke-slate-300";

  const circumference = 2 * Math.PI * 42;
  const dash = (Math.min(100, Math.max(0, lead.lead_score)) / 100) * circumference;

  return (
    <>
      <Link
        href="/crm/leads"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
            {initials(lead.name)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{lead.name}</h1>
            <p className="text-sm text-slate-500">
              {lead.clients?.company_name ?? "Unknown client"} · added {formatDate(lead.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{lead.lead_category} lead</Badge>
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-base p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Lead profile</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="text-sm font-medium text-slate-800">{lead.email ?? "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Estimated budget</dt>
                <dd className="text-sm font-medium text-slate-800">{formatCurrency(lead.budget)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Campaign</dt>
                <dd className="text-sm font-medium text-slate-800">
                  {lead.campaigns?.campaign_name ?? "No campaign"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Source</dt>
                <dd className="text-sm font-medium text-slate-800">{lead.source}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Pipeline status</h3>
            <p className="mb-2 mt-1 text-xs text-slate-400">
              Status is owned by your sales team. Score and category stay read-only.
            </p>
            <div className="max-w-xs">
              <LeadStatusSelect leadId={lead.lead_id} status={lead.status} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">Lead Intelligence</h2>
          </div>

          <div className="mt-5 flex items-center justify-center">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-slate-100" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className={ring}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tracking-tight text-slate-900">
                  {lead.lead_score}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-slate-400">of 100</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <p className="font-medium text-slate-700">How this is calculated</p>
            <p className="mt-1">
              WF-05 scores qualification signals (budget, source, engagement) and assigns
              Hot ≥ 70, Warm ≥ 40, Cold below 40. The CRM only reads these fields — it never
              writes them.
            </p>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            To re-score, send this lead through WF-05 with the service role key.
          </p>
        </div>
      </div>
    </>
  );
}
