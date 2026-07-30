"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Droplets, Thermometer, Brain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePredictions, savePrediction } from "@/lib/cycle";
import CycleCalendar from "@/components/cycle/cycle-calendar";
import LogForm from "@/components/cycle/log-form";
import type { CycleLog, CyclePrediction } from "@/types";

export default function CyclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [prediction, setPrediction] = useState<CyclePrediction | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      loadData(u.id);
    });
  }, [router, supabase]);

  const loadData = async (userId: string) => {
    setLoading(true);
    const { data: logsData } = await supabase.from("cycle_logs").select("*").eq("user_id", userId).order("start_date", { ascending: false });
    setLogs(logsData || []);

    const { data: predData } = await supabase.from("cycle_predictions").select("*").eq("user_id", userId).single();
    if (predData) {
      setPrediction(predData as CyclePrediction);
    } else if (logsData && logsData.length >= 2) {
      const calc = calculatePredictions(logsData);
      if (calc) {
        await savePrediction(userId, calc);
        setPrediction(calc);
      }
    }
    setLoading(false);
  };

  const refresh = () => {
    if (user) loadData(user.id);
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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Cycle Tracking</h1>
          <p className="text-[10px] text-white/30">{logs.length} logs recorded</p>
        </div>
        <button onClick={() => setShowLogForm(true)} className="ml-auto p-2.5 rounded-xl bg-[#FF6B8A]/15 text-[#FF6B8A] hover:bg-[#FF6B8A]/25 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Prediction Card */}
        {prediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl glass border border-white/10 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-[#FF6B8A]" />
              <h3 className="text-sm font-semibold text-white">AI Prediction</h3>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B8A]/10 text-[#FF6B8A] border border-[#FF6B8A]/20">
                {prediction.confidence}% confidence
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Droplets} label="Next Period" value={prediction.predicted_start || "—"} color="#FF6B8A" />
              <StatCard icon={Thermometer} label="Fertile Window" value={`${prediction.fertility_window_start || "—"} - ${prediction.fertility_window_end || ""}`} color="#60a5fa" />
            </div>
            {prediction.ai_note && (
              <p className="mt-3 text-xs text-white/30 italic">{prediction.ai_note}</p>
            )}
          </motion.div>
        )}

        {/* Calendar */}
        <CycleCalendar logs={logs} predictions={prediction} onSelectDate={(d) => { setSelectedDate(d); setShowLogForm(true); }} />

        {/* Recent Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/60">Recent Logs</h3>
            {logs.slice(0, 5).map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FF6B8A]/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#FF6B8A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{log.start_date} {log.end_date ? `— ${log.end_date}` : ""}</p>
                  <p className="text-xs text-white/30">Flow: {log.flow_level}/5</p>
                </div>
                <div className="flex gap-1">
                  {Object.keys(log.symptoms || {}).slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.03] text-white/30 border border-white/[0.06]">{s}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showLogForm && user && (
          <LogForm userId={user.id} selectedDate={selectedDate} onClose={() => setShowLogForm(false)} onSaved={refresh} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] text-white/30">{label}</span>
      </div>
      <p className="text-xs font-medium text-white truncate">{value}</p>
    </div>
  );
}
