"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Loader2, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Source = { title?: string; file_name?: string; url?: string; document_id?: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string;
  sources?: Source[];
  error?: boolean;
};

const SUGGESTIONS = [
  "Which campaign had the highest ROAS last month?",
  "What are the brand guidelines for our top client?",
  "How many hot leads do we have right now?",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            typeof data.response === "string"
              ? data.response
              : "The assistant returned an unexpected response.",
          agent: data.agent_used,
          sources: Array.isArray(data.sources) ? data.sources : [],
          error: !response.ok,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Network error — could not reach the orchestrator.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-base flex h-[calc(100vh-13rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
            <p className="text-[11px] text-slate-400">Orchestrator · SQL · RAG · Lead Intelligence</p>
          </div>
        </div>
        <Badge tone="slate">conversation {conversationId.slice(0, 8)}</Badge>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg py-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <Bot className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Ask about performance, brand knowledge or leads
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The orchestrator routes each question to the right agent and returns the answer with
              its sources.
            </p>
            <div className="mt-5 grid gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/40 hover:text-slate-900"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  message.role === "user"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-brand-50 text-brand-600 ring-1 ring-brand-100"
                }`}
              >
                {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div className={`max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : message.error
                        ? "bg-rose-50 text-rose-800"
                        : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && (message.agent || message.sources?.length) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {message.agent ? <Badge tone="blue">{message.agent}</Badge> : null}
                    {message.sources?.map((source, index) => (
                      <Badge key={index} tone="slate">
                        {source.file_name ?? source.title ?? `source ${index + 1}`}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Routing your question…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about campaigns, ROAS, brand guidelines or leads…"
          className="input-base max-h-32 min-h-[42px] flex-1 resize-none py-2.5"
        />
        <Button type="submit" size="lg" disabled={!input.trim() || loading} className="h-[42px]">
          <ArrowUp className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
