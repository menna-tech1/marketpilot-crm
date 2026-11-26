import { PageHeader } from "@/components/page-header";
import { CampaignsSection } from "@/components/crm/campaigns-section";
import { getCampaigns, getClients } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const [campaigns, clients] = await Promise.all([getCampaigns(), getClients()]);

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Campaigns"
        description="Budget, flight dates and status for every paid and owned channel."
      />
      <CampaignsSection campaigns={campaigns} clients={clients} />
    </>
  );
}
