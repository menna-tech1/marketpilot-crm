/**
 * Environment access.
 * The public values are inlined at build time; server-only secrets are read
 * lazily so the app still builds without a configured project.
 */

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key-placeholder";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const n8nIngestionWebhookUrl = process.env.N8N_INGESTION_WEBHOOK_URL || "";
export const n8nOrchestratorWebhookUrl = process.env.N8N_ORCHESTRATOR_WEBHOOK_URL || "";
export const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET || "";
