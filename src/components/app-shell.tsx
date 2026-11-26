"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils";

const navigation = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/crm/clients", label: "Clients", icon: Building2 },
      { href: "/crm/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/crm/leads", label: "Leads", icon: Users },
      { href: "/crm/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Intelligence",
    items: [{ href: "/chat", label: "AI Assistant", icon: Sparkles }],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {navigation.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                    )}
                  >
                    <item.icon
                      className={cn("h-4 w-4", active ? "text-brand-300" : "text-slate-500")}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ email }: { email: string }) {
  return (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">MarketPilot AI</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">CRM workspace</p>
        </div>
      </div>

      <NavLinks />

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-200">
            {initials(email || "MP")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-200">{email || "Signed in"}</p>
            <p className="text-[10px] text-slate-500">Owner</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarBody email={email} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 shadow-panel">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody email={email} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </button>
          <span className="text-sm font-semibold text-slate-900">MarketPilot AI</span>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
