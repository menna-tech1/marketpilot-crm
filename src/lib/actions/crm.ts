"use server";

import { revalidatePath } from "next/cache";
import { dbError, field, numberField, optional, requireSession } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";

const STATUSES = ["active", "paused", "churned"] as const;

export async function saveClient(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const clientId = optional(formData, "client_id");
  const companyName = field(formData, "company_name");
  const status = field(formData, "status");

  if (companyName.length < 2) {
    return { ok: false, error: "Company name is required." };
  }
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { ok: false, error: "Invalid client status." };
  }

  const payload = {
    company_name: companyName,
    industry: optional(formData, "industry"),
    contact_email: optional(formData, "contact_email"),
    status,
  };

  const { error: writeError } = clientId
    ? await supabase.from("clients").update(payload).eq("client_id", clientId)
    : await supabase.from("clients").insert({ ...payload, owner_id: user.id });

  if (writeError) return dbError(writeError);

  revalidatePath("/crm/clients");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { error: deleteError } = await supabase.from("clients").delete().eq("client_id", clientId);
  if (deleteError) return dbError(deleteError);

  revalidatePath("/crm/clients");
  revalidatePath("/crm/campaigns");
  revalidatePath("/crm/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveCampaign(formData: FormData): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const campaignId = optional(formData, "campaign_id");
  const clientId = optional(formData, "client_id");
  const name = field(formData, "campaign_name");
  const platform = field(formData, "platform");
  const status = field(formData, "status");
  const startDate = optional(formData, "start_date");
  const endDate = optional(formData, "end_date");

  if (!clientId) return { ok: false, error: "Select a client." };
  if (name.length < 2) return { ok: false, error: "Campaign name is required." };
  if (!["Google", "Meta", "LinkedIn", "TikTok", "Email"].includes(platform)) {
    return { ok: false, error: "Invalid platform." };
  }
  if (!["active", "paused", "completed"].includes(status)) {
    return { ok: false, error: "Invalid campaign status." };
  }
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "End date must be after the start date." };
  }

  const payload = {
    client_id: clientId,
    campaign_name: name,
    platform,
    budget: numberField(formData, "budget"),
    start_date: startDate,
    end_date: endDate,
    status,
  };

  const { error: writeError } = campaignId
    ? await supabase.from("campaigns").update(payload).eq("campaign_id", campaignId)
    : await supabase.from("campaigns").insert(payload);

  if (writeError) return dbError(writeError);

  revalidatePath("/crm/campaigns");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireSession();
  if (error || !user) return { ok: false, error: error ?? "Not signed in" };

  const { error: deleteError } = await supabase
    .from("campaigns")
    .delete()
    .eq("campaign_id", campaignId);

  if (deleteError) return dbError(deleteError);

  revalidatePath("/crm/campaigns");
  revalidatePath("/dashboard");
  return { ok: true };
}
