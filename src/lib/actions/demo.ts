"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";

/**
 * Creates the demo dataset (10 clients, 25 campaigns, ~500 leads,
 * ~3,000 daily metric rows) for the signed-in user.
 * The SQL function is SECURITY DEFINER but scopes every row to auth.uid().
 */
export async function seedDemoData(reset = false): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { data, error: rpcError } = await supabase.rpc("seed_demo_data", { p_reset: reset });

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/crm/clients");
  revalidatePath("/crm/campaigns");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/documents");

  const result = data as { skipped?: boolean } | null;
  return { ok: true, warning: result?.skipped ? "Demo data already present." : undefined };
}
