import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Your session expired. Please sign in again." };
  }
  return { supabase, user, error: null };
}

export function dbError(error: { message?: string } | null | undefined): ActionResult {
  const message = error?.message ?? "Something went wrong. Please try again.";
  // Surface RLS / trigger messages, hide internals.
  if (message.includes("row-level security")) {
    return { ok: false, error: "You do not have access to this record." };
  }
  if (message.includes("Lead Intelligence")) {
    return { ok: false, error: "Lead score and category are managed by Lead Intelligence (WF-05)." };
  }
  return { ok: false, error: message };
}

export function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optional(formData: FormData, key: string) {
  const value = field(formData, key);
  return value.length > 0 ? value : null;
}

export function numberField(formData: FormData, key: string, fallback = 0) {
  const value = Number(field(formData, key));
  return Number.isFinite(value) ? value : fallback;
}
