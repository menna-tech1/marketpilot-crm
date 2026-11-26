import { PageHeader } from "@/components/page-header";
import { ChatPanel } from "@/components/chat-panel";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Assistant"
        description="One entry point that routes to SQL analytics, brand knowledge and lead intelligence."
      />
      <ChatPanel />
    </>
  );
}
