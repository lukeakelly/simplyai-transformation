"use server";

import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantContext } from "@/lib/assistant";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AskResult =
  | { ok: true; answer: string }
  | { ok: false; error: string };

const MODEL = "gpt-4o-mini";
const MAX_HISTORY = 10;
const MAX_QUESTION_LEN = 2000;

export async function askAssistant(
  question: string,
  history: ChatMessage[] = [],
): Promise<AskResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const trimmed = question.trim();
  if (!trimmed) return { ok: false, error: "Please enter a question." };
  if (trimmed.length > MAX_QUESTION_LEN) {
    return { ok: false, error: "That question is too long." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "The assistant is not configured (missing API key).",
    };
  }

  const context = await buildAssistantContext();

  const messages = [
    { role: "system" as const, content: ASSISTANT_SYSTEM_PROMPT },
    {
      role: "system" as const,
      content: `Programme snapshot (JSON, source of truth):\n${context}`,
    },
    ...history.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: trimmed },
  ];

  let answer: string;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenAI error", res.status, detail);
      return {
        ok: false,
        error: "The assistant could not answer right now. Please try again.",
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    answer = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!answer) {
      return { ok: false, error: "The assistant returned an empty response." };
    }
  } catch (e) {
    console.error("OpenAI request failed", e);
    return {
      ok: false,
      error: "The assistant could not be reached. Please try again.",
    };
  }

  await logAudit({
    actorRole: session.role,
    action: "asked",
    entityType: "assistant",
    summary: `${session.name || session.role} asked the assistant: "${
      trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed
    }"`,
  });

  return { ok: true, answer };
}
