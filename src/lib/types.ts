export type ClientStatus = "active" | "paused" | "churned";
export type CampaignStatus = "active" | "paused" | "completed";
export type LeadStatus = "new" | "contacted" | "qualified" | "lost";
export type LeadCategory = "Hot" | "Warm" | "Cold";
export type DocumentStatus = "queued" | "processing" | "ready" | "failed";

export type ClientRow = {
  client_id: string;
  company_name: string;
  industry: string | null;
  contact_email: string | null;
  status: ClientStatus;
  created_at: string;
};

export type CampaignRow = {
  campaign_id: string;
  client_id: string;
  campaign_name: string;
  platform: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  created_at: string;
  clients?: { company_name: string } | null;
};

export type LeadRow = {
  lead_id: string;
  client_id: string;
  campaign_id: string | null;
  name: string;
  email: string | null;
  source: string;
  budget: number;
  lead_score: number;
  lead_category: LeadCategory;
  status: LeadStatus;
  created_at: string;
  clients?: { company_name: string } | null;
  campaigns?: { campaign_name: string } | null;
};

export type DocumentRow = {
  document_id: string;
  client_id: string;
  file_name: string;
  storage_path: string;
  status: DocumentStatus;
  chunk_count: number;
  error: string | null;
  created_at: string;
  clients?: { company_name: string } | null;
};

export type ActionResult = { ok: true; warning?: string } | { ok: false; error: string };
