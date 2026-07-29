"use client";

import { useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";

interface CooldownTriggerProps {
  active: boolean;
  onActivate: () => void;
}

export default function CooldownTrigger({ active, onActivate }: CooldownTriggerProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (active) return null;

  return (
    <>
      <button onClick={() => setShowConfirm(true)} className="p-2 rounded-full hover:bg-orange-500/10 transition">
        <Flame className="w-5 h-5 text-orange-500" />
      </button>
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold">Activate Cool-Down Mode?</h3>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">This will lock the chat for both partners for 20 minutes and show a breathing exercise.</p>
            <div className="flex gap-2">
              <button onClick={() => { onActivate(); setShowConfirm(false); }}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition">Activate</button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)] transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
