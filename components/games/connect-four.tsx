"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GameSession } from "@/types";

interface ConnectFourProps {
  session: GameSession;
  userId: string;
  onUpdate: (session: GameSession) => void;
}

const ROWS = 6;
const COLS = 7;
type Cell = "R" | "Y" | null;

export default function ConnectFour({ session, userId, onUpdate }: ConnectFourProps) {
  const supabase = createClient();
  const state = (session.state as { board: Cell[][]; rPlayer: string; yPlayer: string }) || { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), rPlayer: session.current_turn || userId, yPlayer: "" };
  const [board, setBoard] = useState<Cell[][]>(state.board || Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const isMyTurn = session.current_turn === userId;
  const myColor = state.rPlayer === userId ? "R" : "Y";

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "move" }, (payload) => {
        const newState = payload.payload as { board: Cell[][]; current_turn: string };
        setBoard(newState.board);
        onUpdate({ ...session, state: { ...state, board: newState.board }, current_turn: newState.current_turn });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase]);

  const checkWinner = (b: Cell[][]): Cell => {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = b[r][c];
        if (!cell) continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== cell) break;
            count++;
          }
          if (count === 4) return cell;
        }
      }
    }
    return null;
  };

  const dropPiece = async (col: number) => {
    if (!isMyTurn) return;
    const newBoard = board.map((row) => [...row]);
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newBoard[r][col]) { row = r; break; }
    }
    if (row === -1) return;
    newBoard[row][col] = myColor;
    const winner = checkWinner(newBoard);
    const nextTurn = state.rPlayer === session.current_turn ? state.yPlayer : state.rPlayer;
    const update = { state: { ...state, board: newBoard }, current_turn: nextTurn, winner_id: winner ? userId : null };
    await supabase.from("game_sessions").update(update).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "move", payload: { board: newBoard, current_turn: nextTurn } });
    setBoard(newBoard);
  };

  const winner = checkWinner(board);

  return (
    <div className="space-y-3">
      <div className="text-center text-xs text-[var(--muted-foreground)]">
        {winner ? `Winner: ${winner === "R" ? "Red" : "Yellow"}` : isMyTurn ? "Your turn" : "Partner's turn"}
      </div>
      <div className="space-y-1">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1 justify-center">
            {row.map((cell, c) => (
              <button key={c} onClick={() => dropPiece(c)} disabled={!isMyTurn || !!winner || !!board[0][c]}
                className={`w-8 h-8 rounded-full border-2 transition ${
                  cell === "R" ? "bg-red-500 border-red-600" :
                  cell === "Y" ? "bg-yellow-400 border-yellow-500" :
                  "bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]"
                }`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
