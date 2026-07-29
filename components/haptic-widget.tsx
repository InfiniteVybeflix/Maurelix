"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, Heart, Clock, Activity } from "lucide-react";

const PATTERNS = [
  { id: "think", label: "Thinking of you", pattern: [500], icon: Heart },
  { id: "miss", label: "Miss you", pattern: [200, 100, 200], icon: Clock },
  { id: "love", label: "Love you", pattern: [100, 50, 100, 50, 100, 50, 300], icon: Activity },
];

interface HapticWidgetProps {
  partnerId?: string | null;
}

export default function HapticWidget({ partnerId }: HapticWidgetProps) {
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const sendHaptic = async (pattern: number[]) => {
    const canVibrate = "vibrate" in navigator;
    if (canVibrate) navigator.vibrate(pattern);
    if (partnerId) {
      await supabase.from("notifications").insert({
        user_id: partnerId,
        type: "haptic",
        title: "Heartbeat",
        body: "Your partner sent you a heartbeat.",
        data: { pattern },
      });
    }
    setOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {open && (
        <div className="absolute bottom-14 right-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-3 space-y-2 min-w-[180px]">
          {PATTERNS.map((p) => (
            <button key={p.id} onClick={() => sendHaptic(p.pattern)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition text-left">
              <p.icon className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-[var(--accent)] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition">
        <Zap className="w-5 h-5" />
      </button>
    </div>
  );
}
