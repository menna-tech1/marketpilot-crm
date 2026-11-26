import Link from "next/link";
import { BarChart3, BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(600px circle at 10% 10%, rgba(59,102,245,.35), transparent 45%), radial-gradient(500px circle at 90% 80%, rgba(16,185,129,.18), transparent 45%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-900/40">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">MarketPilot AI</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Marketing intelligence
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            One workspace for clients, campaigns and AI-driven decisions.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            CRM, analytics, brand knowledge and lead intelligence — connected to your n8n and
            Gemini workflows.
          </p>

          <div className="mt-10 grid max-w-md gap-4">
            {[
              { icon: BarChart3, title: "Campaign analytics", copy: "ROAS, CPL and CTR per campaign." },
              { icon: BrainCircuit, title: "AI assistant", copy: "Ask questions in plain language." },
              { icon: ShieldCheck, title: "Row level security", copy: "Every client isolated at the database." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-brand-300 ring-1 ring-white/10">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          Next.js · Supabase · n8n · Gemini — 2026
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-slate-900">MarketPilot AI</p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-1 mb-7 text-sm text-slate-500">
            Sign in to manage clients, campaigns and leads.
          </p>

          {isSupabaseConfigured ? (
            <AuthForm next={target} />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Supabase is not configured yet.</p>
              <p className="mt-1 text-amber-800">
                Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                <code className="rounded bg-amber-100 px-1">.env.local</code>, then restart the server.
              </p>
              <Link href="/setup" className="mt-3 inline-block font-medium underline">
                Open setup checklist →
              </Link>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            <Link href="/setup" className="hover:text-slate-600">
              Deployment checklist
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
