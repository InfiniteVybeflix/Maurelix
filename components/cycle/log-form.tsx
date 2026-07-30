"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Droplets, Thermometer, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogFormProps {
  userId: string;
  selectedDate: Date;
  onClose: () => void;
  onSaved: () => void;
}

const SYMPTOMS = ["Cramps", "Bloating", "Headache", "Mood swings", "Fatigue", "Acne", "Cravings", "Insomnia"];

export default function LogForm({ userId, selectedDate, onClose, onSaved }: LogFormProps) {
  const supabase = createClient();
  const [startDate, setStartDate] = useState(selectedDate.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [flowLevel, setFlowLevel] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [shared, setShared] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("cycle_logs").insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate || null,
      flow_level: flowLevel,
      symptoms: Object.fromEntries(selectedSymptoms.map((s) => [s, true])),
      basal_temp: temp ? parseFloat(temp) : null,
      notes_encrypted: notes || null,
      shared_with_partner: shared,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-2xl glass shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#0a0a1a]/80 backdrop-blur-xl z-10">
          <h3 className="text-lg font-semibold text-white">Log Cycle Day</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30" />
            </div>
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
              <Droplets className="w-3 h-3" /> Flow Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setFlowLevel(level)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    flowLevel === level
                      ? "bg-[#FF6B8A]/20 text-[#FF6B8A] border border-[#FF6B8A]/30"
                      : "bg-white/[0.02] text-white/30 border border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Symptoms</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedSymptoms.includes(s)
                      ? "bg-[#FF6B8A]/15 text-[#FF6B8A] border border-[#FF6B8A]/25"
                      : "bg-white/[0.02] text-white/30 border border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                <Thermometer className="w-3 h-3" /> Basal Temp
              </label>
              <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="36.5" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B8A]/30" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" /> Notes
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How are you feeling?" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B8A]/30 resize-none" />
          </div>

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/10 transition-colors">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="w-4 h-4 rounded accent-[#FF6B8A]" />
            <span className="text-sm text-white/50">Share with partner</span>
          </label>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-white font-medium text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save Log"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
