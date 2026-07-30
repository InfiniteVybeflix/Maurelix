"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROWS = 6;
const COLS = 7;

interface ConnectFourProps {
  session: { id: string; state: any; current_turn: string | null };
  userId: string;
  onUpdate: (s: any) => void;
}

export default function ConnectFour({ session, userId, onUpdate }: ConnectFourProps) {
  const supabase = createClient();
  const state = session.state || { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), players: {}, winner: null };
  const mySymbol = state.players?.[userId] || "R";
  const isMyTurn = session.current_turn === userId;

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "c4" }, (payload) => {
        onUpdate({ ...session, state: payload.payload });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase, onUpdate, session]);

  const dropPiece = async (col: number) => {
    if (!isMyTurn || state.winner) return;
    const board = state.board.map((r: any[]) => [...r]);
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) { row = r; break; }
    }
    if (row === -1) return;
    board[row][col] = mySymbol;
    const winner = checkWinner(board);
    const newState = { ...state, board, winner };
    const nextTurn = Object.keys(state.players).find((id) => id !== userId) || userId;

    await supabase.from("game_sessions").update({ state: newState, current_turn: nextTurn, winner_id: winner ? userId : null }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "c4", payload: newState });
  };

  const reset = async () => {
    const newState = { ...state, board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), winner: null };
    await supabase.from("game_sessions").update({ state: newState, current_turn: userId, winner_id: null }).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "c4", payload: newState });
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-white/40 mb-4">
        {state.winner ? `Winner: ${state.winner}` : isMyTurn ? "Your turn" : "Partner's turn"}
      </p>
      <div className="inline-block p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        {state.board.map((row: any[], r: number) => (
          <div key={r} className="flex gap-1.5 mb-1.5">
            {row.map((cell: string | null, c: number) => (
              <motion.button
                key={c}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dropPiece(c)}
                className="w-10 h-10 rounded-full border border-white/[0.08] transition-colors"
                style={{
                  background: cell === "R" ? "linear-gradient(135deg, #FF6B8A, #e94560)"
                    : cell === "Y" ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
                    : "rgba(255,255,255,0.03)",
                  boxShadow: cell ? `0 0 12px ${cell === "R" ? "rgba(255,107,138,0.4)" : "rgba(251,191,36,0.4)"}` : "none",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={reset}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors text-sm"
      >
        <RotateCcw className="w-4 h-4" /> Reset
      </button>
    </div>
  );
}

function checkWinner(board: (string | null)[][]): string | null {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === cell) count++;
          else break;
        }
        if (count === 4) return cell;
      }
    }
  }
  return board.every((r) => r.every((c) => c)) ? "Draw" : null;
}
