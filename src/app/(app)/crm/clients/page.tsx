import { PageHeader } from "@/components/page-header";
import { ClientsSection } from "@/components/crm/clients-section";
import { getClients } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Clients"
        description="Every client workspace you manage. Campaigns, leads and documents roll up to these records."
      />
      <ClientsSection clients={clients} />
    </>
  );
}
