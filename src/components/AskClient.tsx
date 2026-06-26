"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, Loader2 } from "lucide-react";
import { askAssistant, type ChatMessage } from "@/app/assistant-actions";

const SUGGESTIONS = [
  "Who owns the utilisation dashboard?",
  "What is Kylie's overall % complete?",
  "Which critical path items are not started?",
  "How many Dora items are there and how complete are they?",
  "List the tasks in the first 30 days horizon by owner.",
  "Who has the most tasks assigned?",
];

export function AskClient({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);

    const history = messages;
    const next: ChatMessage[] = [...history, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const res = await askAssistant(q, history);
    setLoading(false);

    if (res.ok) {
      setMessages([...next, { role: "assistant", content: res.answer }]);
    } else {
      setError(res.error);
      setMessages(history);
      setInput(q);
    }
  }

  return (
    <div className="pt-14 lg:pt-0 flex flex-col h-screen">
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={22} className="text-blue-600" /> Ask
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ask questions about the transformation programme — ownership, progress,
          horizons and more. Answers are grounded in the live tracker data.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-700">
                Hi {userName} — what would you like to know?
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Try one of these to get started:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-blue-600 text-white"
                }`}
              >
                {m.role === "user" ? <User size={16} /> : <Sparkles size={16} />}
              </div>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Sparkles size={16} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm inline-flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Thinking…
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p className="mb-2 text-xs font-medium text-red-600">{error}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Ask about owners, progress, horizons…"
              className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="mt-2 text-[11px] text-slate-400">
            Answers are generated from the live tracker. Double-check anything
            important.
          </p>
        </div>
      </div>
    </div>
  );
}
