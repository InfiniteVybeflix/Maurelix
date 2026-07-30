"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Droplets } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from "date-fns";
import type { CycleLog } from "@/types";

interface CycleCalendarProps {
  logs: CycleLog[];
  predictions: { predicted_start: string | null; predicted_end: string | null; fertility_window_start: string | null; fertility_window_end: string | null; pms_window_start: string | null } | null;
  onSelectDate: (date: Date) => void;
}

export default function CycleCalendar({ logs, predictions, onSelectDate }: CycleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const log = logs.find((l) => l.start_date <= dateStr && (!l.end_date || l.end_date >= dateStr));
    if (log) return { type: "period", intensity: log.flow_level };
    if (predictions?.predicted_start && predictions?.predicted_end) {
      if (dateStr >= predictions.predicted_start && dateStr <= predictions.predicted_end) return { type: "predicted" };
    }
    if (predictions?.fertility_window_start && predictions?.fertility_window_end) {
      if (dateStr >= predictions.fertility_window_start && dateStr <= predictions.fertility_window_end) return { type: "fertile" };
    }
    if (predictions?.pms_window_start) {
      if (dateStr >= predictions.pms_window_start && dateStr < (predictions.predicted_start || "")) return { type: "pms" };
    }
    return null;
  };

  return (
    <div className="rounded-2xl glass border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-semibold text-white">{format(currentMonth, "MMMM yyyy")}</h3>
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["S","M","T","W","T","F","S"].map((d) => (
          <div key={d} className="text-center text-[10px] text-white/20 font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const status = getDayStatus(day);
          const isToday = isSameDay(day, new Date());
          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectDate(day)}
              className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-all relative ${
                isToday ? "ring-1 ring-[#FF6B8A]" : ""
              }`}
              style={{
                background: status?.type === "period" ? `rgba(255,107,138,${0.1 + (status.intensity || 1) * 0.15})`
                  : status?.type === "predicted" ? "rgba(167,139,250,0.15)"
                  : status?.type === "fertile" ? "rgba(96,165,250,0.15)"
                  : status?.type === "pms" ? "rgba(251,191,36,0.1)"
                  : "transparent",
                color: status?.type === "period" ? "#FF6B8A"
                  : status?.type === "predicted" ? "#a78bfa"
                  : status?.type === "fertile" ? "#60a5fa"
                  : status?.type === "pms" ? "#fbbf24"
                  : "rgba(255,255,255,0.4)",
              }}
            >
              {format(day, "d")}
              {status?.type === "period" && (
                <Droplets className="absolute bottom-0.5 w-2.5 h-2.5 text-[#FF6B8A]" />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 pt-3 border-t border-white/[0.06]">
        <Legend color="#FF6B8A" label="Period" />
        <Legend color="#a78bfa" label="Predicted" />
        <Legend color="#60a5fa" label="Fertile" />
        <Legend color="#fbbf24" label="PMS" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}
