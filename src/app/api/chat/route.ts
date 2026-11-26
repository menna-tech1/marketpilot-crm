import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { n8nOrchestratorWebhookUrl, n8nWebhookSecret } from "@/lib/env";

type ChatRequest = {
  message?: string;
  conversation_id?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  const conversationId = body.conversation_id ?? crypto.randomUUID();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "message is too long" }, { status: 400 });
  }

  // Contract A: Frontend -> Orchestrator
  const payload = {
    message,
    conversation_id: conversationId,
    user_id: user.id,
  };

  if (!n8nOrchestratorWebhookUrl) {
    return NextResponse.json({
      status: "success",
      conversation_id: conversationId,
      agent_used: "mock",
      response:
        "The AI orchestrator is not connected yet. Set ORCHESTRATOR_WEBHOOK_URL (WF-01) to route this question to the SQL, RAG and Lead Intelligence agents.",
      data: null,
      sources: [],
      error: null,
    });
  }

  try {
    const response = await fetch(n8nOrchestratorWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(n8nWebhookSecret ? { "x-webhook-secret": n8nWebhookSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          conversation_id: conversationId,
          response: "The AI orchestrator did not respond in time. Please try again.",
          error: `upstream_${response.status}`,
        },
        { status: 502 },
      );
    }

    // Contract F: Orchestrator -> Frontend
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        conversation_id: conversationId,
        response: "Could not reach the AI orchestrator. Check the WF-01 webhook and try again.",
        error: "orchestrator_unreachable",
      },
      { status: 502 },
    );
  }
}
