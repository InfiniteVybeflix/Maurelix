"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, X, Send } from "lucide-react";

interface GratitudeButtonProps {
  coupleId: string;
  partnerId: string;
}

export default function GratitudeButton({ coupleId, partnerId }: GratitudeButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !message.trim()) return;
    await supabase.from("gratitude_jar").insert({ couple_id: coupleId, sender_id: user.id, recipient_id: partnerId, message: message.trim() });
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-[280px] right-4 z-40 w-12 h-12 rounded-full bg-pink-500 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition">
        <Heart className="w-5 h-5 fill-white" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Gratitude Jar</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">What are you thankful for? (1 sentence max)</p>
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={120} placeholder="I'm thankful for..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-3" />
            <button onClick={submit} disabled={!message.trim()} className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Add to Jar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
