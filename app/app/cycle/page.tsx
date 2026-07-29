"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculatePredictions } from "@/lib/cycle";
import CycleCalendar from "@/components/cycle/cycle-calendar";
import LogForm from "@/components/cycle/log-form";
import { CycleLog, CyclePrediction, Profile } from "@/types";
import { Plus, ArrowLeft, Sparkles, Droplets } from "lucide-react";

export default function CyclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [prediction, setPrediction] = useState<CyclePrediction | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
      supabase.from("cycle_logs").select("*").eq("user_id", authUser.id).order("start_date", { ascending: false }).then(({ data }) => {
        if (data) {
          setLogs(data);
          const pred = calculatePredictions(data);
          if (pred) {
            pred.user_id = authUser.id;
            setPrediction(pred);
            supabase.from("cycle_predictions").upsert({ ...pred }).then(() => {});
          }
        }
      });
    });
  }, [router, supabase]);

  const handleAddLog = async (log: Partial<CycleLog>) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data } = await supabase.from("cycle_logs").insert({ ...log, user_id: authUser.id }).select().single();
    if (data) {
      const updated = [data, ...logs];
      setLogs(updated);
      const pred = calculatePredictions(updated);
      if (pred) {
        pred.user_id = authUser.id;
        setPrediction(pred);
        await supabase.from("cycle_predictions").upsert({ ...pred });
      }
      setShowForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Cycle Tracker</h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {prediction && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Next Prediction</h3>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Predicted start: <span className="font-medium text-[var(--foreground)]">{prediction.predicted_start}</span></p>
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Confidence: <span className="font-medium text-[var(--foreground)]">{prediction.confidence}%</span></p>
            {prediction.ai_note && <p className="text-[10px] text-orange-500 mt-2">{prediction.ai_note}</p>}
          </div>
        )}
        <CycleCalendar logs={logs} prediction={prediction} currentMonth={currentMonth} onMonthChange={setCurrentMonth} onSelectDate={() => setShowForm(true)} />
        {showForm && <LogForm onSubmit={handleAddLog} onCancel={() => setShowForm(false)} />}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Log Period
          </button>
        )}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Recent Logs</h3>
          {logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-medium">{log.start_date}</span>
                {log.end_date && <span className="text-[10px] text-[var(--muted-foreground)]">→ {log.end_date}</span>}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: log.flow_level || 1 }).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
