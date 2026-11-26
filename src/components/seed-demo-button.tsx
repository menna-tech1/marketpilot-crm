"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2 } from "lucide-react";
import { seedDemoData } from "@/lib/actions/demo";
import { Button } from "@/components/ui/button";

export function SeedDemoButton({
  reset = false,
  label = "Load demo data",
}: {
  reset?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={reset ? "outline" : "primary"}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await seedDemoData(reset);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        {!pending ? <Database className="h-4 w-4" /> : null}
        {label}
      </Button>
      {error ? <p className="max-w-xs text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
