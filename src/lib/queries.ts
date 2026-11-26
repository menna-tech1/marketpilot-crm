import { createClient } from "@/lib/supabase/server";
import type { CampaignRow, ClientRow, DocumentRow, LeadRow } from "@/lib/types";

export type CampaignKpi = {
  campaign_id: string;
  client_id: string;
  campaign_name: string;
  platform: string;
  status: string;
  budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
  ctr_pct: number;
  roas: number;
  cpl: number;
};

export async function getClients(): Promise<ClientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("client_id, company_name, industry, contact_email, status, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as ClientRow[];
}

export async function getCampaigns(): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      "campaign_id, client_id, campaign_name, platform, budget, start_date, end_date, status, created_at, clients(company_name)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as CampaignRow[];
}

export async function getLeads(limit = 1000): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "lead_id, client_id, campaign_id, name, email, source, budget, lead_score, lead_category, status, created_at, clients(company_name), campaigns(campaign_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as LeadRow[];
}

export async function getLead(leadId: string): Promise<LeadRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "lead_id, client_id, campaign_id, name, email, source, budget, lead_score, lead_category, status, created_at, clients(company_name), campaigns(campaign_name)",
    )
    .eq("lead_id", leadId)
    .maybeSingle();
  return (data as unknown as LeadRow) ?? null;
}

export async function getDocuments(): Promise<(DocumentRow & { downloadUrl: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "document_id, client_id, file_name, storage_path, status, chunk_count, error, created_at, clients(company_name)",
    )
    .order("created_at", { ascending: false });

  const documents = (data ?? []) as unknown as DocumentRow[];
  if (documents.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrls(documents.map((d) => d.storage_path), 60 * 60);

  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return documents.map((doc) => ({
    ...doc,
    downloadUrl: byPath.get(doc.storage_path) ?? null,
  }));
}

export async function getCampaignKpis(): Promise<CampaignKpi[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_campaign_kpis")
    .select("*")
    .order("spend", { ascending: false });
  return (data ?? []) as CampaignKpi[];
}

export async function getDashboardData() {
  const [clients, campaigns, leads, kpis] = await Promise.all([
    getClients(),
    getCampaigns(),
    getLeads(500),
    getCampaignKpis(),
  ]);

  const spend = kpis.reduce((sum, k) => sum + Number(k.spend), 0);
  const revenue = kpis.reduce((sum, k) => sum + Number(k.revenue), 0);
  const conversions = kpis.reduce((sum, k) => sum + Number(k.conversions), 0);
  const impressions = kpis.reduce((sum, k) => sum + Number(k.impressions), 0);
  const clicks = kpis.reduce((sum, k) => sum + Number(k.clicks), 0);
  const kpiLeads = kpis.reduce((sum, k) => sum + Number(k.leads), 0);

  return {
    clients,
    campaigns,
    leads,
    kpis,
    totals: {
      spend,
      revenue,
      conversions,
      impressions,
      clicks,
      roas: spend > 0 ? revenue / spend : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpl: kpiLeads > 0 ? spend / kpiLeads : 0,
      hotLeads: leads.filter((l) => l.lead_category === "Hot").length,
    },
  };
}
