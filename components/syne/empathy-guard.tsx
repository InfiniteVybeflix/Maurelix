"use client";

import { motion } from "framer-motion";
import { Heart, Send, X, Sparkles } from "lucide-react";
import type { SyneResponse } from "@/lib/syne";

interface EmpathyGuardProps {
  original: string;
  empathyCheck: SyneResponse;
  onSendSuggestion: () => void;
  onSendOriginal: () => void;
  onDismiss: () => void;
}

export default function EmpathyGuard({
  original,
  empathyCheck,
  onSendSuggestion,
  onSendOriginal,
  onDismiss,
}: EmpathyGuardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mx-4 mb-3 p-4 rounded-2xl bg-gradient-to-br from-[#FF6B8A]/10 to-[#a78bfa]/5 border border-[#FF6B8A]/20 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FF6B8A]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-[#FF6B8A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white mb-1">Syne suggests a gentler way</p>
          <p className="text-sm text-white/60 mb-3 leading-relaxed">
            {empathyCheck.suggestion || empathyCheck.content}
          </p>
          {empathyCheck.explanation && (
            <p className="text-xs text-white/30 mb-3 italic">{empathyCheck.explanation}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onSendSuggestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white btn-glow"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              <Send className="w-3.5 h-3.5" />
              Send Suggestion
            </button>
            <button
              onClick={onSendOriginal}
              className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            >
              Send Original
            </button>
            <button
              onClick={onDismiss}
              className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
