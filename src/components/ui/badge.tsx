import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "violet";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blue: "bg-brand-50 text-brand-700 ring-brand-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone: Record<string, Tone> = {
  active: "green",
  ready: "green",
  qualified: "green",
  paused: "amber",
  processing: "amber",
  contacted: "blue",
  new: "blue",
  queued: "slate",
  completed: "violet",
  churned: "red",
  failed: "red",
  lost: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "slate"}>{status}</Badge>;
}
