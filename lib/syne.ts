"use client";

import { SYNE_SYSTEM_PROMPT } from "./syne-prompt";

export interface SyneResponse {
  content: string;
  sentiment_score?: number;
  is_harmful?: boolean;
  suggestion?: string;
  explanation?: string;
}

export async function askSyne(messages: { role: string; content: string }[], context?: { coupleContext?: unknown; vaultContext?: boolean; mode?: "empathy" | "briefing" | "game" | "chat" }): Promise<SyneResponse | null> {
  const url = process.env.NEXT_PUBLIC_AEVIBRON_GATEWAY_URL;
  const key = process.env.AEVIBRON_API_KEY;
  if (!url || !key) return null;

  const system = `${SYNE_SYSTEM_PROMPT}

Mode: ${context?.mode || "chat"}.${context?.vaultContext ? " You are in Private Vault mode." : ""}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": key,
      },
      body: JSON.stringify({
        model: "aevibron-core-v3",
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.8,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (context?.mode === "empathy") {
      try {
        const parsed = JSON.parse(content);
        return { content: parsed.suggestion || content, ...parsed };
      } catch {
        return { content };
      }
    }

    return { content };
  } catch {
    return null;
  }
}
