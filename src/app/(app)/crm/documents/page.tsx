import { PageHeader } from "@/components/page-header";
import { DocumentsSection } from "@/components/crm/documents-section";
import { getClients, getDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [documents, clients] = await Promise.all([getDocuments(), getClients()]);

  return (
    <>
      <PageHeader
        eyebrow="Knowledge"
        title="Documents"
        description="Brand guidelines, briefs and reports ingested into the RAG knowledge base."
      />
      <DocumentsSection documents={documents} clients={clients} />
    </>
  );
}
