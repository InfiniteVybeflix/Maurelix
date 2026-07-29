"use client";

import { useMemo } from "react";
import { CycleLog, CyclePrediction } from "@/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Droplets, Thermometer, Sparkles } from "lucide-react";

interface CycleCalendarProps {
  logs: CycleLog[];
  prediction: CyclePrediction | null;
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  onSelectDate: (d: Date) => void;
}

export default function CycleCalendar({ logs, prediction, currentMonth, onMonthChange, onSelectDate }: CycleCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getDayStatus = (day: Date) => {
    const log = logs.find((l) => isSameDay(new Date(l.start_date), day) || (l.end_date && day >= new Date(l.start_date) && day <= new Date(l.end_date)));
    if (log) return { type: "period", level: log.flow_level };
    if (prediction?.predicted_start && isSameDay(day, new Date(prediction.predicted_start))) return { type: "predicted" };
    if (prediction?.fertility_window_start && prediction?.fertility_window_end) {
      const fs = new Date(prediction.fertility_window_start);
      const fe = new Date(prediction.fertility_window_end);
      if (day >= fs && day <= fe) return { type: "fertile" };
    }
    if (prediction?.pms_window_start) {
      const ps = new Date(prediction.pms_window_start);
      const pe = prediction.predicted_start ? new Date(prediction.predicted_start) : ps;
      if (day >= ps && day <= pe) return { type: "pms" };
    }
    return null;
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["S","M","T","W","T","F","S"].map((d) => <span key={d} className="text-[10px] text-[var(--muted-foreground)] font-medium">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const status = getDayStatus(day);
          return (
            <button key={day.toISOString()} onClick={() => onSelectDate(day)}
              className={`aspect-square rounded-lg text-xs flex items-center justify-center transition ${
                status?.type === "period" ? "bg-[var(--accent)] text-white" :
                status?.type === "predicted" ? "bg-[var(--accent)]/30 border border-[var(--accent)]" :
                status?.type === "fertile" ? "bg-green-500/20 text-green-600" :
                status?.type === "pms" ? "bg-yellow-500/20 text-yellow-600" :
                "hover:bg-[var(--muted)]"
              }`}>
              {format(day, "d")}
              {status?.type === "period" && status.level && (
                <div className="absolute bottom-0.5 flex gap-px">
                  {Array.from({ length: status.level }).map((_, i) => <div key={i} className="w-0.5 h-0.5 rounded-full bg-white/60" />)}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 text-[10px]">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Period</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500/40" /> Fertile</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500/40" /> PMS</span>
      </div>
    </div>
  );
}
