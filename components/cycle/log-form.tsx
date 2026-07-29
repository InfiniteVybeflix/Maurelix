"use client";

import { useState } from "react";
import { CycleLog } from "@/types";
import { Droplets, Thermometer, Lock, Unlock } from "lucide-react";

interface LogFormProps {
  onSubmit: (log: Partial<CycleLog>) => void;
  onCancel: () => void;
  initialDate?: Date;
}

const SYMPTOMS = ["Cramps", "Bloating", "Headache", "Fatigue", "Mood swings", "Acne", "Back pain", "Nausea"];

export default function LogForm({ onSubmit, onCancel, initialDate }: LogFormProps) {
  const [startDate, setStartDate] = useState(initialDate ? initialDate.toISOString().split("T")[0] : "");
  const [endDate, setEndDate] = useState("");
  const [flowLevel, setFlowLevel] = useState(3);
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({});
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [shared, setShared] = useState(true);

  const toggleSymptom = (s: string) => setSymptoms((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleSubmit = () => {
    onSubmit({
      start_date: startDate,
      end_date: endDate || null,
      flow_level: flowLevel,
      symptoms,
      basal_temp: temp ? parseFloat(temp) : null,
      notes_encrypted: notes || null,
      shared_with_partner: shared,
    });
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
      <h3 className="text-sm font-semibold">Log Cycle Day</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium flex items-center gap-1"><Droplets className="w-3 h-3" /> Flow Level</label>
        <input type="range" min={1} max={5} value={flowLevel} onChange={(e) => setFlowLevel(parseInt(e.target.value))} className="w-full mt-2 accent-[var(--accent)]" />
        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]"><span>Light</span><span>Heavy</span></div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium">Symptoms</label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SYMPTOMS.map((s) => (
            <button key={s} onClick={() => toggleSymptom(s)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${symptoms[s] ? "bg-[var(--accent)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium flex items-center gap-1"><Thermometer className="w-3 h-3" /> Basal Temp (°C)</label>
        <input type="number" step="0.01" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="36.50"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
      </div>
      <div>
        <label className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
      </div>
      <button onClick={() => setShared(!shared)} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        {shared ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        {shared ? "Shared with partner" : "Private only"}
      </button>
      <div className="flex gap-2">
        <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition">Save Log</button>
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)] transition">Cancel</button>
      </div>
    </div>
  );
}
