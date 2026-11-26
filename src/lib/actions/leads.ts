"use server";

import { revalidatePath } from "next/cache";
import { dbError, field, numberField, optional, requireSession } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";

const LEAD_STATUSES = ["new", "contacted", "qualified", "lost"] as const;

export async function saveLead(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const leadId = optional(formData, "lead_id");
  const clientId = optional(formData, "client_id");
  const campaignId = optional(formData, "campaign_id");
  const name = field(formData, "name");
  const status = field(formData, "status");

  if (!clientId) return { ok: false, error: "Select a client." };
  if (name.length < 2) return { ok: false, error: "Lead name is required." };
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return { ok: false, error: "Invalid lead status." };
  }

  // lead_score / lead_category are intentionally not writable here: WF-05 owns them.
  const payload = {
    client_id: clientId,
    campaign_id: campaignId,
    name,
    email: optional(formData, "email"),
    source: field(formData, "source") || "Organic",
    budget: numberField(formData, "budget"),
    status,
  };

  const { error: writeError } = leadId
    ? await supabase.from("leads").update(payload).eq("lead_id", leadId)
    : await supabase.from("leads").insert(payload);

  if (writeError) return dbError(writeError);

  revalidatePath("/crm/leads");
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateLeadStatus(leadId: string, status: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return { ok: false, error: "Invalid lead status." };
  }

  const { error: writeError } = await supabase
    .from("leads")
    .update({ status })
    .eq("lead_id", leadId);

  if (writeError) return dbError(writeError);

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${leadId}`);
  return { ok: true };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { error: deleteError } = await supabase.from("leads").delete().eq("lead_id", leadId);
  if (deleteError) return dbError(deleteError);

  revalidatePath("/crm/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}
