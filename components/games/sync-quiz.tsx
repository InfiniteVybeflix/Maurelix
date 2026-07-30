"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const QUESTIONS = [
  { q: "What is my favorite color?", options: ["Red", "Blue", "Green", "Purple"] },
  { q: "What food do I love most?", options: ["Pizza", "Sushi", "Burgers", "Pasta"] },
  { q: "What is my dream vacation spot?", options: ["Paris", "Tokyo", "Maldives", "New York"] },
  { q: "What movie genre do I prefer?", options: ["Romance", "Action", "Comedy", "Horror"] },
  { q: "What is my favorite season?", options: ["Spring", "Summer", "Autumn", "Winter"] },
];

interface SyncQuizProps {
  session: { id: string; state: any; current_turn: string | null };
  userId: string;
  onUpdate: (s: any) => void;
}

export default function SyncQuiz({ session, userId, onUpdate }: SyncQuizProps) {
  const supabase = createClient();
  const state = session.state || { 
    answers: {}, 
    scores: {}, 
    currentQuestion: 0, 
    phase: "answering", // answering | guessing | results
    guesser: null,
  };

  const myAnswers = state.answers?.[userId] || [];
  const partnerId = Object.keys(state.answers || {}).find((id) => id !== userId) || "";
  const partnerAnswers = state.answers?.[partnerId] || [];
  const isMyTurn = session.current_turn === userId;
  const currentQ = QUESTIONS[state.currentQuestion || 0];

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "quiz" }, (payload) => {
        onUpdate({ ...session, state: payload.payload });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase, onUpdate, session]);

  const submitAnswer = async (answerIndex: number) => {
    if (!isMyTurn) return;
    const newAnswers = { ...state.answers, [userId]: [...myAnswers, answerIndex] };
    const newState = { ...state, answers: newAnswers };

    // If both answered, move to guessing phase
    const allAnswered = Object.keys(newAnswers).length >= 2;
    if (allAnswered) {
      newState.phase = "guessing";
      newState.guesser = userId;
    }

    const nextTurn = partnerId || userId;
    await supabase.from("game_sessions").update({ 
      state: newState, 
      current_turn: nextTurn 
    }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ 
      type: "broadcast", 
      event: "quiz", 
      payload: newState 
    });
  };

  const submitGuess = async (guessIndex: number) => {
    if (state.guesser !== userId) return;
    const partnerAnswer = partnerAnswers[state.currentQuestion || 0];
    const correct = guessIndex === partnerAnswer;

    const newScores = { ...state.scores };
    newScores[userId] = (newScores[userId] || 0) + (correct ? 1 : 0);

    const nextQuestion = (state.currentQuestion || 0) + 1;
    const newState = { 
      ...state, 
      scores: newScores,
      currentQuestion: nextQuestion,
      phase: nextQuestion >= QUESTIONS.length ? "results" : "answering",
      guesser: null,
    };

    await supabase.from("game_sessions").update({ 
      state: newState, 
      current_turn: userId 
    }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ 
      type: "broadcast", 
      event: "quiz", 
      payload: newState 
    });
  };

  const reset = async () => {
    const newState = { 
      answers: {}, 
      scores: {}, 
      currentQuestion: 0, 
      phase: "answering",
      guesser: null,
    };
    await supabase.from("game_sessions").update({ 
      state: newState, 
      current_turn: userId,
      winner_id: null,
    }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ 
      type: "broadcast", 
      event: "quiz", 
      payload: newState 
    });
  };

  if (state.phase === "results") {
    const myScore = state.scores?.[userId] || 0;
    const partnerScore = state.scores?.[partnerId] || 0;
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-white">Quiz Complete!</h3>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#FF6B8A]">{myScore}</p>
            <p className="text-xs text-white/30">You</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#60a5fa]">{partnerScore}</p>
            <p className="text-xs text-white/30">Partner</p>
          </div>
        </div>
        <button onClick={reset} className="px-6 py-2.5 rounded-xl text-white text-sm font-medium btn-glow" style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
          Play Again
        </button>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-white/30 mb-1">Question {Math.min((state.currentQuestion || 0) + 1, QUESTIONS.length)} of {QUESTIONS.length}</p>
        <h3 className="text-lg font-medium text-white">{currentQ.q}</h3>
      </div>

      {state.phase === "answering" && (
        <div className="space-y-2">
          <p className="text-sm text-white/40 text-center">{isMyTurn ? "Your turn to answer" : "Waiting for partner..."}</p>
          <div className="grid grid-cols-2 gap-2">
            {currentQ.options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={isMyTurn ? { scale: 1.02 } : {}}
                whileTap={isMyTurn ? { scale: 0.98 } : {}}
                onClick={() => submitAnswer(i)}
                disabled={!isMyTurn || myAnswers.length > (state.currentQuestion || 0)}
                className="py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/70 hover:border-[#FF6B8A]/30 hover:bg-white/[0.05] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {state.phase === "guessing" && (
        <div className="space-y-2">
          <p className="text-sm text-white/40 text-center">
            {state.guesser === userId ? "Guess your partner's answer!" : "Partner is guessing your answer..."}
          </p>
          {state.guesser === userId && (
            <div className="grid grid-cols-2 gap-2">
              {currentQ.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => submitGuess(i)}
                  className="py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/70 hover:border-[#FF6B8A]/30 hover:bg-white/[0.05] transition-all"
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
