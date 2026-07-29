"use client";

import { Heart, X, Check, Edit3 } from "lucide-react";

interface EmpathyGuardProps {
  original: string;
  suggestion: string;
  explanation: string;
  onUseSuggestion: () => void;
  onSendOriginal: () => void;
  onDismiss: () => void;
}

export default function EmpathyGuard({ original, suggestion, explanation, onUseSuggestion, onSendOriginal, onDismiss }: EmpathyGuardProps) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 bg-[var(--card)] border border-[var(--accent)]/30 rounded-2xl shadow-2xl p-4 max-w-md mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-1">Syne suggests a gentler way</p>
          <p className="text-[11px] text-[var(--muted-foreground)] mb-2">{explanation}</p>
          <div className="p-2 rounded-lg bg-[var(--muted)] text-xs mb-3">{suggestion}</div>
          <div className="flex gap-2">
            <button onClick={onUseSuggestion}
              className="flex-1 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition flex items-center justify-center gap-1">
              <Check className="w-3 h-3" /> Use Suggestion
            </button>
            <button onClick={onSendOriginal}
              className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)] transition flex items-center justify-center gap-1">
              <Edit3 className="w-3 h-3" /> Send Original
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 rounded-full hover:bg-[var(--muted)] transition">
          <X className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>
      </div>
    </div>
  );
}
