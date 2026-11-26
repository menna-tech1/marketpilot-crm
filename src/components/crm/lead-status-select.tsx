"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus } from "@/lib/actions/leads";
import { Select } from "@/components/ui/field";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await updateLeadStatus(leadId, next);
            if (!result.ok) {
              setError(result.error);
              setValue(status);
              return;
            }
            router.refresh();
          });
        }}
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="qualified">Qualified</option>
        <option value="lost">Lost</option>
      </Select>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {pending ? <p className="mt-1 text-xs text-slate-400">Saving…</p> : null}
    </div>
  );
}
