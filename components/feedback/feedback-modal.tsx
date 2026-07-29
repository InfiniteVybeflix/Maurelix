"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send, Bug, Lightbulb, ShieldAlert } from "lucide-react";

interface FeedbackModalProps {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<"bug" | "feature" | "spam">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !title.trim() || !description.trim()) return;
    await supabase.from("feedback").insert({ user_id: user.id, category, title: title.trim(), description: description.trim() });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">Feedback</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-4 h-4" /></button>
        </div>
        {submitted ? (
          <div className="text-center py-6">
            <Send className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
            <p className="text-sm font-medium">Thank you!</p>
            <p className="text-xs text-[var(--muted-foreground)]">Your feedback has been submitted.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["bug", "feature", "spam"] as const).map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 ${
                    category === c ? "bg-[var(--accent)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}>
                  {c === "bug" ? <Bug className="w-3 h-3" /> : c === "feature" ? <Lightbulb className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <textarea placeholder="Describe your feedback..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <button onClick={submit} disabled={!title.trim() || !description.trim()}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">Submit</button>
          </div>
        )}
      </div>
    </div>
  );
}
