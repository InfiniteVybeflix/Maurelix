"use client";

import { CycleLog, CyclePrediction } from "@/types";

export function calculatePredictions(logs: CycleLog[]): CyclePrediction | null {
  if (logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round((new Date(sorted[i].start_date).getTime() - new Date(sorted[i - 1].start_date).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 10 && days < 60) lengths.push(days);
  }
  if (lengths.length === 0) return null;

  const weighted = lengths.map((l, i) => ({ length: l, weight: i >= lengths.length - 3 ? 2 : 1 }));
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const avg = weighted.reduce((s, w) => s + w.length * w.weight, 0) / totalWeight;
  const variance = weighted.reduce((s, w) => s + w.weight * Math.pow(w.length - avg, 2), 0) / totalWeight;
  const stdDev = Math.sqrt(variance);

  const lastStart = new Date(sorted[sorted.length - 1].start_date);
  const predictedStart = new Date(lastStart);
  predictedStart.setDate(predictedStart.getDate() + Math.round(avg));
  const predictedEnd = new Date(predictedStart);
  predictedEnd.setDate(predictedEnd.getDate() + 5);

  const fertileStart = new Date(predictedStart);
  fertileStart.setDate(fertileStart.getDate() - 17);
  const fertileEnd = new Date(predictedStart);
  fertileEnd.setDate(fertileEnd.getDate() - 11);

  const pmsStart = new Date(predictedStart);
  pmsStart.setDate(pmsStart.getDate() - 5);

  const confidence = Math.max(10, Math.min(100, Math.round(100 - stdDev * 5)));

  return {
    id: "",
    user_id: "",
    predicted_start: predictedStart.toISOString().split("T")[0],
    predicted_end: predictedEnd.toISOString().split("T")[0],
    confidence,
    fertility_window_start: fertileStart.toISOString().split("T")[0],
    fertility_window_end: fertileEnd.toISOString().split("T")[0],
    pms_window_start: pmsStart.toISOString().split("T")[0],
    ai_note: stdDev > 10 || logs.length < 3 ? "Learning your pattern. Add more logs for accuracy." : null,
    created_at: new Date().toISOString(),
  };
}
