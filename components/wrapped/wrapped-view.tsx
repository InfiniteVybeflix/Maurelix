"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Download, Heart, MessageCircle, MapPin, Gamepad2 } from "lucide-react";
import html2canvas from "html2canvas";

interface WrappedViewProps {
  onClose: () => void;
  stats: {
    messagesSent: number;
    daysTogether: number;
    memoriesCreated: number;
    gamesPlayed: number;
    topLoveLanguage: string;
  };
}

export default function WrappedView({ onClose, stats }: WrappedViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#0a0a1a", scale: 2 });
    const link = document.createElement("a");
    link.download = "maurelix-wrapped.png";
    link.href = canvas.toDataURL();
    link.click();
    setDownloading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.12] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div ref={cardRef} className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1a1a3e 0%, #0a0a1a 100%)" }}>
          <div className="px-6 pt-8 pb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FF6B8A]/20">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Our Year Together</h2>
            <p className="text-white/40 text-sm mt-1">Maurelix Wrapped</p>
          </div>

          <div className="px-6 pb-6 space-y-3">
            <StatRow icon={MessageCircle} label="Messages Sent" value={stats.messagesSent.toLocaleString()} color="#FF6B8A" />
            <StatRow icon={Heart} label="Days Together" value={stats.daysTogether.toString()} color="#e94560" />
            <StatRow icon={MapPin} label="Memories Created" value={stats.memoriesCreated.toString()} color="#60a5fa" />
            <StatRow icon={Gamepad2} label="Games Played" value={stats.gamesPlayed.toString()} color="#fbbf24" />
            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Top Love Language</p>
              <p className="text-sm font-medium text-white">{stats.topLoveLanguage}</p>
            </div>
          </div>

          <div className="px-6 pb-8">
            <button
              onClick={download}
              disabled={downloading}
              className="w-full py-3 rounded-2xl text-white font-medium text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" /> Save Image
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-white/30">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
