import { createClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabaseUrl } from "@/lib/env";

/**
 * Service-role client. Server only — never import this from a Client Component.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function createAdminClient() {
  if (!serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
