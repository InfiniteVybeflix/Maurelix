"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bug, Lightbulb, AlertTriangle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackModalProps {
  onClose: () => void;
}

const CATEGORIES = [
  { key: "bug", label: "Bug Report", icon: Bug, color: "#ef4444" },
  { key: "feature", label: "Feature Request", icon: Lightbulb, color: "#fbbf24" },
  { key: "spam", label: "Other", icon: AlertTriangle, color: "#a78bfa" },
];

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feedback").insert({
      user_id: user?.id,
      category,
      title: title.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl glass shadow-2xl border border-white/10 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Feedback</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Send className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-white/60">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all ${
                      category === c.key
                        ? "border-white/20 bg-white/[0.05]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
                    }`}
                  >
                    <c.icon className="w-4 h-4" style={{ color: c.color }} />
                    <span className="text-[10px] text-white/50">{c.label}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/30"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe in detail..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/30 resize-none"
              />

              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !description.trim() || submitting}
                className="w-full py-3 rounded-xl text-white font-medium text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Feedback
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
