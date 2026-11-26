import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "1 · Create the Supabase project",
    body: "Copy the Project URL and the anon (public) key into .env.local. Never put the service_role key in the browser or in NEXT_PUBLIC_*.",
  },
  {
    title: "2 · Run the migrations",
    body: "Paste supabase/migrations/0001 → 0004 into the SQL editor in order, or run `supabase db push` if you use the CLI. This creates tables, RLS policies, the private documents bucket and the KPI view.",
  },
  {
    title: "3 · Configure auth",
    body: "For the demo, turn off “Confirm email” in Authentication → Providers → Email, then create an account and press “Load demo data” on the dashboard.",
  },
  {
    title: "4 · Point the app at n8n",
    body: "Set N8N_INGESTION_WEBHOOK_URL (WF-03), ORCHESTRATOR_WEBHOOK_URL (WF-01) and a shared N8N_WEBHOOK_SECRET. Ingestion calls send the secret as x-webhook-secret.",
  },
  {
    title: "5 · Deploy",
    body: "Push to GitHub, import the repo in Vercel, add the same variables (service_role as a server-only secret), then verify sign-in, CRUD, upload and chat on the production URL.",
  },
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
        MarketPilot AI
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Setup checklist</h1>
      <p className="mt-2 text-sm text-slate-500">
        Everything the CRM + Auth + Supabase + Deploy role needs to get the app live.
      </p>

      <div
        className={`mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
          isSupabaseConfigured
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-900"
        }`}
      >
        {isSupabaseConfigured ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {isSupabaseConfigured
          ? "Supabase environment variables detected."
          : "Supabase environment variables are missing."}
      </div>

      <ol className="mt-8 space-y-4">
        {steps.map((step) => (
          <li key={step.title} className="card-base p-5">
            <h2 className="text-sm font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Environment variables</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # server only
N8N_INGESTION_WEBHOOK_URL=https://n8n.../webhook/ingest
ORCHESTRATOR_WEBHOOK_URL=https://n8n.../webhook/orchestrator
N8N_WEBHOOK_SECRET=change-me`}
        </pre>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link href="/login" className="hover:text-slate-600">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
