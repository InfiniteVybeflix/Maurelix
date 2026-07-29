"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { askSyne } from "@/lib/syne";
import { GameSession } from "@/types";

interface SyncQuizProps {
  session: GameSession;
  userId: string;
  onUpdate: (session: GameSession) => void;
}

export default function SyncQuiz({ session, userId, onUpdate }: SyncQuizProps) {
  const supabase = createClient();
  const state = (session.state as { question: string; options: string[]; answers: Record<string, string>; revealed: boolean }) || { question: "", options: [], answers: {}, revealed: false };
  const [question, setQuestion] = useState(state.question);
  const [options, setOptions] = useState<string[]>(state.options);
  const [selected, setSelected] = useState("");
  const [revealed, setRevealed] = useState(state.revealed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "quiz" }, (payload) => {
        const data = payload.payload as { question: string; options: string[]; answers: Record<string, string>; revealed: boolean };
        setQuestion(data.question);
        setOptions(data.options);
        setRevealed(data.revealed);
        onUpdate({ ...session, state: data });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase]);

  const generateQuestion = async () => {
    setLoading(true);
    const res = await askSyne([{ role: "user", content: "Generate a fun couples trivia question with 4 multiple choice answers. Return JSON: { question: string, options: string[], correct: number }." }], { mode: "game" });
    setLoading(false);
    if (res) {
      try {
        const parsed = JSON.parse(res.content);
        const newState = { question: parsed.question, options: parsed.options, answers: {}, revealed: false };
        setQuestion(parsed.question);
        setOptions(parsed.options);
        setRevealed(false);
        setSelected("");
        await supabase.from("game_sessions").update({ state: newState }).eq("id", session.id);
        await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "quiz", payload: newState });
      } catch {}
    }
  };

  const submitAnswer = async (opt: string) => {
    setSelected(opt);
    const newAnswers = { ...state.answers, [userId]: opt };
    const newState = { ...state, answers: newAnswers };
    await supabase.from("game_sessions").update({ state: newState }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "quiz", payload: newState });
  };

  const reveal = async () => {
    const newState = { ...state, revealed: true };
    setRevealed(true);
    await supabase.from("game_sessions").update({ state: newState }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "quiz", payload: newState });
  };

  return (
    <div className="space-y-4">
      {!question && (
        <button onClick={generateQuestion} disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
          {loading ? "Generating..." : "New Question"}
        </button>
      )}
      {question && (
        <>
          <p className="text-sm font-medium text-center">{question}</p>
          <div className="space-y-2">
            {options.map((opt) => (
              <button key={opt} onClick={() => submitAnswer(opt)} disabled={!!selected || revealed}
                className={`w-full py-2.5 rounded-xl text-xs font-medium transition ${
                  selected === opt ? "bg-[var(--accent)] text-white" :
                  revealed && state.answers && Object.values(state.answers).includes(opt) ? "bg-green-500/20 text-green-600" :
                  "bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
                }`}>
                {opt}
              </button>
            ))}
          </div>
          {selected && !revealed && (
            <button onClick={reveal} className="w-full py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition">Reveal Answers</button>
          )}
          {revealed && (
            <div className="text-center text-xs text-[var(--muted-foreground)]">
              {Object.entries(state.answers || {}).map(([uid, ans]) => (
                <p key={uid}>{uid === userId ? "You" : "Partner"}: {ans}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
