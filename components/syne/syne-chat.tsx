"use client";

import { useState, useRef, useEffect } from "react";
import { askSyne } from "@/lib/syne";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";

interface SyneChatProps {
  coupleId?: string;
  vaultMode?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function SyneChat({ coupleId, vaultMode }: SyneChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const response = await askSyne([...history, { role: "user", content: userMsg }], {
      coupleContext: coupleId ? { coupleId } : undefined,
      vaultContext: vaultMode,
      mode: "chat",
    });
    setLoading(false);
    if (response) {
      setMessages((prev) => [...prev, { role: "assistant", content: response.content }]);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full bg-[var(--accent)]/90 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition">
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>
      {open && (
        <div className="fixed bottom-52 right-4 z-40 w-80 h-96 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-semibold">Syne</span>
            {vaultMode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">Vault</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
            {messages.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)] text-center mt-8">Ask Syne anything. Syne is the space between two hearts.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${m.role === "user" ? "bg-[var(--accent)] text-white rounded-br-sm" : "bg-[var(--muted)] rounded-bl-sm"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="px-3 py-2 rounded-xl bg-[var(--muted)] text-xs animate-pulse">Syne is thinking...</div></div>}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-[var(--border)] flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Syne..."
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition disabled:opacity-50">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
