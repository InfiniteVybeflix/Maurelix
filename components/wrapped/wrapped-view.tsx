"use client";

import { useRef } from "react";
import { Message, Quest, GratitudeItem, MemoryPin } from "@/types";
import { Heart, MessageCircle, MapPin, Star, Sparkles } from "lucide-react";

interface WrappedViewProps {
  messages: Message[];
  quests: Quest[];
  gratitude: GratitudeItem[];
  pins: MemoryPin[];
  onClose: () => void;
}

export default function WrappedView({ messages, quests, gratitude, pins, onClose }: WrappedViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(ref.current, { backgroundColor: "#1a1a2e" });
    const link = document.createElement("a");
    link.download = "maurelix-wrapped.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div ref={ref} className="bg-[#1a1a2e] rounded-xl p-6 text-white space-y-4">
          <div className="text-center">
            <Heart className="w-10 h-10 text-[#FF6B8A] fill-[#FF6B8A] mx-auto mb-2" />
            <h2 className="text-xl font-bold">Our Year Together</h2>
            <p className="text-xs text-white/60">Maurelix Wrapped</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <MessageCircle className="w-5 h-5 mx-auto mb-1 text-[#FF6B8A]" />
              <p className="text-lg font-bold">{messages.length}</p>
              <p className="text-[10px] text-white/60">Messages</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Star className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
              <p className="text-lg font-bold">{quests.filter((q) => q.status === "completed").length}</p>
              <p className="text-[10px] text-white/60">Quests Done</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <MapPin className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <p className="text-lg font-bold">{pins.filter((p) => p.unlocked_at).length}</p>
              <p className="text-[10px] text-white/60">Memories</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <p className="text-lg font-bold">{gratitude.length}</p>
              <p className="text-[10px] text-white/60">Gratitude Notes</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={download} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition">Download Image</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition">Close</button>
        </div>
      </div>
    </div>
  );
}
