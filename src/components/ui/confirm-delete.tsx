"use client";

import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";

export function ConfirmDelete({
  onConfirm,
  title = "Delete",
}: {
  onConfirm: () => Promise<void> | void;
  title?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        title={title}
        onClick={() => setConfirming(true)}
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">{title}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1 py-0.5">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
          setConfirming(false);
        }}
        className="rounded p-1 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
        title="Confirm delete"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded p-1 text-slate-500 hover:bg-slate-100"
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
}
