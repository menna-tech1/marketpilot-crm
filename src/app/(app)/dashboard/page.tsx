import Link from "next/link";
import {
  ArrowUpRight,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SeedDemoButton } from "@/components/seed-demo-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { clients, campaigns, leads, kpis, totals } = await getDashboardData();
  const hasData = clients.length > 0;

  const topCampaigns = [...kpis]
    .filter((k) => Number(k.spend) > 0)
    .sort((a, b) => Number(b.roas) - Number(a.roas))
    .slice(0, 5);

  const maxRoas = Math.max(1, ...topCampaigns.map((k) => Number(k.roas)));

  const pipeline = {
    Hot: leads.filter((l) => l.lead_category === "Hot").length,
    Warm: leads.filter((l) => l.lead_category === "Warm").length,
    Cold: leads.filter((l) => l.lead_category === "Cold").length,
  };
  const totalLeads = Math.max(1, pipeline.Hot + pipeline.Warm + pipeline.Cold);

  const openLeads = leads.filter((l) => l.status === "new" || l.status === "contacted").length;
  const qualified = leads.filter((l) => l.status === "qualified").length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Business overview"
        description="Performance across every client and campaign in your workspace."
        actions={
          hasData ? (
            <Link
              href="/chat"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Ask AI <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : null
        }
      />

      {!hasData ? (
        <div className="card-base flex flex-col items-start gap-4 p-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your workspace is empty</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Load the demo dataset to explore the CRM with 10 clients, 25 campaigns, ~500 leads and
              120 days of campaign metrics. All rows are created under your account and protected by
              row level security.
            </p>
          </div>
          <SeedDemoButton />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Ad spend"
              value={formatCurrency(totals.spend)}
              hint={`${campaigns.length} campaigns tracked`}
              icon={DollarSign}
            />
            <Stat
              label="Revenue"
              value={formatCurrency(totals.revenue)}
              hint={`${formatNumber(totals.conversions)} conversions`}
              icon={TrendingUp}
            />
            <Stat
              label="ROAS"
              value={`${totals.roas.toFixed(2)}x`}
              hint={`CTR ${totals.ctr.toFixed(2)}%`}
              icon={Target}
            />
            <Stat
              label="Leads"
              value={formatNumber(leads.length)}
              hint={`${totals.hotLeads} hot · ${qualified} qualified`}
              icon={Users}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="card-base p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Top campaigns by ROAS</h2>
                  <p className="text-xs text-slate-400">Lifetime performance, all clients</p>
                </div>
                <Link
                  href="/crm/campaigns"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all
                </Link>
              </div>

              <ul className="mt-5 space-y-4">
                {topCampaigns.map((campaign) => (
                  <li key={campaign.campaign_id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {campaign.campaign_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {campaign.platform} · {formatCurrency(campaign.spend)} spend
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {Number(campaign.roas).toFixed(2)}x
                        </span>
                        <Badge tone={Number(campaign.roas) >= 3 ? "green" : Number(campaign.roas) >= 1.5 ? "amber" : "red"}>
                          {Number(campaign.roas) >= 3 ? "Strong" : Number(campaign.roas) >= 1.5 ? "Fair" : "Weak"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max(4, (Number(campaign.roas) / maxRoas) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {topCampaigns.length === 0 ? (
                  <li className="text-sm text-slate-400">No campaign metrics yet.</li>
                ) : null}
              </ul>
            </div>

            <div className="card-base p-5">
              <h2 className="text-sm font-semibold text-slate-900">Lead pipeline</h2>
              <p className="text-xs text-slate-400">Scored by Lead Intelligence (WF-05)</p>

              <div className="mt-5 space-y-3">
                {(
                  [
                    ["Hot", pipeline.Hot, "bg-rose-500", "text-rose-600"],
                    ["Warm", pipeline.Warm, "bg-amber-400", "text-amber-600"],
                    ["Cold", pipeline.Cold, "bg-slate-300", "text-slate-500"],
                  ] as const
                ).map(([label, count, bar, text]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${text}`}>{label}</span>
                      <span className="text-slate-600">{count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${bar}`}
                        style={{ width: `${Math.max(2, (count / totalLeads) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Open leads</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{openLeads}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Qualified</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{qualified}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">CPL</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {formatCurrency(totals.cpl)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Clicks</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {formatNumber(totals.clicks)}
                  </dd>
                </div>
              </dl>

              <Link
                href="/crm/leads"
                className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Open lead list <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-6 card-base overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent campaigns</h2>
                <p className="text-xs text-slate-400">Latest activity across the workspace</p>
              </div>
              <Link
                href="/crm/campaigns"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Manage
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">Campaign</th>
                    <th className="px-5 py-2.5 font-semibold">Client</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Spend</th>
                    <th className="px-5 py-2.5 text-right font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.slice(0, 6).map((campaign) => {
                    const kpi = kpis.find((k) => k.campaign_id === campaign.campaign_id);
                    return (
                      <tr key={campaign.campaign_id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {campaign.campaign_name}
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {campaign.clients?.company_name ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatCurrency(kpi?.spend ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">
                          {Number(kpi?.roas ?? 0).toFixed(2)}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
