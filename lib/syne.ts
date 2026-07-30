"use client";

export interface SyneResponse {
  content: string;
  sentiment_score?: number;
  is_harmful?: boolean;
  suggestion?: string;
  explanation?: string;
}

export async function askSyne(
  messages: { role: string; content: string }[],
  context?: {
    coupleContext?: unknown;
    vaultContext?: boolean;
    mode?: "empathy" | "briefing" | "game" | "chat";
  }
): Promise<SyneResponse | null> {
  try {
    const res = await fetch("/api/syne", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context, temperature: 0.8 }),
    });

    if (!res.ok) {
      console.error("Syne API error:", res.status);
      return null;
    }

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
  } catch (err) {
    console.error("askSyne error:", err);
    return null;
  }
}
