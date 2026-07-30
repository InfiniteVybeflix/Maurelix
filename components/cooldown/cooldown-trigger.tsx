"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Timer, X } from "lucide-react";

interface CooldownTriggerProps {
  onActivate: () => void;
  active: boolean;
  remainingMinutes: number;
}

export default function CooldownTrigger({ onActivate, active, remainingMinutes }: CooldownTriggerProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (active) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B8A]/10 border border-[#FF6B8A]/20"
      >
        <Wind className="w-4 h-4 text-[#FF6B8A] animate-pulse" />
        <span className="text-sm text-[#FF6B8A]">{remainingMinutes}m cool-down</span>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(!showConfirm)}
        className="p-2.5 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors"
        title="Activate cool-down mode"
      >
        <Wind className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 bottom-12 w-64 p-4 rounded-2xl glass shadow-2xl border border-white/10 z-50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#FF6B8A]" />
                <span className="text-sm font-medium text-white">Cool-down Mode</span>
              </div>
              <button onClick={() => setShowConfirm(false)} className="p-1 rounded-lg hover:bg-white/[0.05] text-white/30">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-white/40 mb-4">Lock chat for 20 minutes to cool off. Both partners will be notified.</p>
            <button
              onClick={() => { onActivate(); setShowConfirm(false); }}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium btn-glow"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              Activate 20min Lock
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
