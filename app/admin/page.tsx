"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminGuard from "@/components/admin/admin-guard";
import { ArrowLeft, Users, MessageSquare, Phone, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: string;
  user_id: string;
  category: "bug" | "feature" | "spam";
  title: string;
  description: string;
  screenshot_url: string | null;
  status: "open" | "reviewing" | "resolved";
  created_at: string;
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState({ couples: 0, messages: 0, calls: 0, feedback: 0 });
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "reviewing" | "resolved">("all");

  useEffect(() => {
    supabase.from("couples").select("id", { count: "exact", head: true }).then(({ count }) => setStats((s) => ({ ...s, couples: count || 0 })));
    supabase.from("messages").select("id", { count: "exact", head: true }).then(({ count }) => setStats((s) => ({ ...s, messages: count || 0 })));
    supabase.from("webrtc_signals").select("id", { count: "exact", head: true }).then(({ count }) => setStats((s) => ({ ...s, calls: count || 0 })));
    loadFeedback();
  }, [supabase]);

  const loadFeedback = async () => {
    const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (data) setFeedbackList(data as FeedbackItem[]);
  };

  const updateStatus = async (id: string, status: "open" | "reviewing" | "resolved") => {
    await supabase.from("feedback").update({ status }).eq("id", id);
    loadFeedback();
  };

  const filtered = filter === "all" ? feedbackList : feedbackList.filter((f) => f.status === filter);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Admin Dashboard</h1>
      </header>
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Couples" value={stats.couples} />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messages} />
          <StatCard icon={Phone} label="Calls" value={stats.calls} />
          <StatCard icon={AlertCircle} label="Feedback" value={stats.feedback} />
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-3">Feedback</h2>
          <div className="flex gap-2 mb-3">
            {(["all", "open", "reviewing", "resolved"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-[10px] font-medium transition ${filter === f ? "bg-[var(--accent)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold">{item.title}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{item.description}</p>
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{item.category}</span>
                  </div>
                  <div className="flex gap-1">
                    {item.status !== "reviewing" && (
                      <button onClick={() => updateStatus(item.id, "reviewing")} className="p-1 rounded-full hover:bg-yellow-500/10 transition"><Clock className="w-3 h-3 text-yellow-500" /></button>
                    )}
                    {item.status !== "resolved" && (
                      <button onClick={() => updateStatus(item.id, "resolved")} className="p-1 rounded-full hover:bg-green-500/10 transition"><CheckCircle className="w-3 h-3 text-green-500" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-center">
      <Icon className="w-5 h-5 text-[var(--accent)] mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
