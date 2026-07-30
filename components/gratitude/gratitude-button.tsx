"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GratitudeButtonProps {
  coupleId: string;
  partnerId: string;
}

const SUGGESTIONS = [
  "Thank you for being my safe space.",
  "I appreciate how you always listen.",
  "Your smile makes my day better.",
  "I'm grateful for your patience.",
  "You make ordinary moments magical.",
];

export default function GratitudeButton({ coupleId, partnerId }: GratitudeButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    await supabase.from("gratitude_jar").insert({
      couple_id: coupleId,
      sender_id: user.id,
      recipient_id: partnerId,
      message: message.trim(),
    });

    setSending(false);
    setSent(true);
    setMessage("");
    setTimeout(() => { setSent(false); setOpen(false); }, 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-[#FF6B8A] transition-colors"
        title="Send gratitude"
      >
        <Heart className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 bottom-12 w-72 p-4 rounded-2xl glass shadow-2xl border border-white/10 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Send Gratitude</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/[0.05] text-white/30">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {sent ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center py-6"
              >
                <Heart className="w-8 h-8 text-[#FF6B8A] mx-auto mb-2" />
                <p className="text-sm text-white/60">Sent with love 💫</p>
              </motion.div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setMessage(s)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/40 hover:text-white/70 hover:border-white/15 transition-colors text-left"
                    >
                      {s.slice(0, 30)}...
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What are you grateful for?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/30 resize-none mb-3"
                />
                <button
                  onClick={send}
                  disabled={!message.trim() || sending}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium btn-glow flex items-center justify-center gap-2 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send
                    </>
                  )}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
