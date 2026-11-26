import { PageHeader } from "@/components/page-header";
import { LeadsSection } from "@/components/crm/leads-section";
import { getCampaigns, getClients, getLeads } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, clients, campaigns] = await Promise.all([getLeads(), getClients(), getCampaigns()]);

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Every captured lead with its score, category and pipeline status."
      />
      <LeadsSection leads={leads} clients={clients} campaigns={campaigns} />
    </>
  );
}
