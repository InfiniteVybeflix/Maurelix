"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TicTacToeProps {
  session: { id: string; state: any; current_turn: string | null };
  userId: string;
  onUpdate: (s: any) => void;
}

export default function TicTacToe({ session, userId, onUpdate }: TicTacToeProps) {
  const supabase = createClient();
  const state = session.state || { board: Array(9).fill(null), players: {}, winner: null };
  const mySymbol = state.players?.[userId] || "X";
  const isMyTurn = session.current_turn === userId;

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "ttt" }, (payload) => {
        onUpdate({ ...session, state: payload.payload });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase, onUpdate, session]);

  const makeMove = async (index: number) => {
    if (!isMyTurn || state.board[index] || state.winner) return;
    const newBoard = [...state.board];
    newBoard[index] = mySymbol;
    const winner = checkWinner(newBoard);
    const newState = { ...state, board: newBoard, winner };
    const nextTurn = Object.keys(state.players).find((id) => id !== userId) || userId;

    await supabase.from("game_sessions").update({ state: newState, current_turn: nextTurn, winner_id: winner ? userId : null }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "ttt", payload: newState });
  };

  const reset = async () => {
    const newState = { ...state, board: Array(9).fill(null), winner: null };
    await supabase.from("game_sessions").update({ state: newState, current_turn: userId, winner_id: null }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "ttt", payload: newState });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <p className="text-sm text-white/40">
          {state.winner ? `Winner: ${state.winner}` : isMyTurn ? "Your turn" : "Partner's turn"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {state.board.map((cell: string | null, i: number) => (
          <motion.button
            key={i}
            whileHover={{ scale: cell ? 1 : 1.05 }}
            whileTap={{ scale: cell ? 1 : 0.95 }}
            onClick={() => makeMove(i)}
            className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-3xl font-bold transition-colors hover:border-white/15"
            style={cell === "X" ? { color: "#FF6B8A" } : cell === "O" ? { color: "#60a5fa" } : {}}
          >
            {cell}
          </motion.button>
        ))}
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors text-sm"
      >
        <RotateCcw className="w-4 h-4" /> Reset
      </button>
    </div>
  );
}

function checkWinner(board: (string | null)[]): string | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every((c) => c) ? "Draw" : null;
}
