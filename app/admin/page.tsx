"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Users, MessageSquare, Bug, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AdminGuard from "@/components/admin/admin-guard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}

function AdminContent() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState({ users: 0, couples: 0, messages: 0, feedback: 0 });
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: couples } = await supabase.from("couples").select("*", { count: "exact", head: true });
    const { count: messages } = await supabase.from("messages").select("*", { count: "exact", head: true });
    const { data: fb } = await supabase.from("feedback").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(20);
    setStats({ users: users || 0, couples: couples || 0, messages: messages || 0, feedback: fb?.length || 0 });
    setFeedbackItems(fb || []);
    setLoading(false);
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    await supabase.from("feedback").update({ status }).eq("id", id);
    loadStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
        <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Users" value={stats.users} color="#FF6B8A" />
          <StatCard icon={Activity} label="Couples" value={stats.couples} color="#60a5fa" />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messages} color="#34d399" />
          <StatCard icon={Bug} label="Feedback" value={stats.feedback} color="#fbbf24" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Feedback</h3>
          <div className="space-y-2">
            {feedbackItems.map((fb) => (
              <motion.div
                key={fb.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        fb.category === "bug" ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : fb.category === "feature" ? "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20"
                        : "bg-[#a78bfa]/10 text-[#a78bfa] border-[#a78bfa]/20"
                      }`}>
                        {fb.category}
                      </span>
                      <span className="text-[10px] text-white/20">{fb.profiles?.display_name || "Anonymous"}</span>
                    </div>
                    <p className="text-sm text-white font-medium">{fb.title}</p>
                    <p className="text-xs text-white/30 mt-1">{fb.description}</p>
                  </div>
                  <select
                    value={fb.status}
                    onChange={(e) => updateFeedbackStatus(fb.id, e.target.value)}
                    className="text-xs bg-white/[0.03] border border-white/10 text-white/50 rounded-lg px-2 py-1 focus:outline-none focus:border-[#FF6B8A]/30"
                  >
                    <option value="open">Open</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06] text-center">
      <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/30">{label}</p>
    </div>
  );
}
