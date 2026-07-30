"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, X, Bot } from "lucide-react";
import { askSyne } from "@/lib/syne";

interface SyneChatProps {
  onClose: () => void;
}

export default function SyneChat({ onClose }: SyneChatProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const res = await askSyne([...messages, { role: "user", content: userMsg }], { mode: "chat" });
    setLoading(false);

    if (res) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.content }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm here. Tell me more. 💫" }]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-20 right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] rounded-2xl overflow-hidden flex flex-col glass shadow-2xl border border-white/10 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Syne</p>
            <p className="text-[10px] text-white/30">Your co-mind</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-[#FF6B8A]" />
            </div>
            <p className="text-sm text-white/40">Ask Syne anything.</p>
            <p className="text-xs text-white/20 mt-1">Syne is the space between two hearts.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "message-bubble-own rounded-br-md"
                : "message-bubble-partner rounded-bl-md"
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-5 h-5 rounded-full bg-[#FF6B8A]/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#FF6B8A] animate-pulse" />
            </div>
            <span className="text-xs text-white/30">Syne is thinking...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Syne..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center btn-glow disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
