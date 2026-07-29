"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GameSession } from "@/types";

interface TicTacToeProps {
  session: GameSession;
  userId: string;
  onUpdate: (session: GameSession) => void;
}

type Cell = "X" | "O" | null;

export default function TicTacToe({ session, userId, onUpdate }: TicTacToeProps) {
  const supabase = createClient();
  const state = (session.state as { board: Cell[]; xPlayer: string; oPlayer: string }) || { board: Array(9).fill(null), xPlayer: session.current_turn || userId, oPlayer: "" };
  const [board, setBoard] = useState<Cell[]>(state.board || Array(9).fill(null));
  const isMyTurn = session.current_turn === userId;
  const mySymbol = state.xPlayer === userId ? "X" : "O";

  useEffect(() => {
    const channel = supabase.channel(`game:${session.id}`)
      .on("broadcast", { event: "move" }, (payload) => {
        const newState = payload.payload as { board: Cell[]; current_turn: string };
        setBoard(newState.board);
        onUpdate({ ...session, state: { ...state, board: newState.board }, current_turn: newState.current_turn });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.id, supabase]);

  const checkWinner = (b: Cell[]): Cell => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b1,c] of lines) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    return null;
  };

  const handleClick = async (idx: number) => {
    if (!isMyTurn || board[idx] || checkWinner(board)) return;
    const newBoard = [...board];
    newBoard[idx] = mySymbol;
    const winner = checkWinner(newBoard);
    const nextTurn = state.xPlayer === session.current_turn ? state.oPlayer : state.xPlayer;
    const update = { state: { ...state, board: newBoard }, current_turn: nextTurn, winner_id: winner ? userId : null };
    await supabase.from("game_sessions").update(update).eq("id", session.id);
    await supabase.channel(`game:${session.id}`).send({ type: "broadcast", event: "move", payload: { board: newBoard, current_turn: nextTurn } });
    setBoard(newBoard);
  };

  const winner = checkWinner(board);
  const isDraw = !winner && board.every((c) => c !== null);

  return (
    <div className="space-y-3">
      <div className="text-center text-xs text-[var(--muted-foreground)]">
        {winner ? `Winner: ${winner}` : isDraw ? "Draw!" : isMyTurn ? "Your turn" : "Partner's turn"}
      </div>
      <div className="grid grid-cols-3 gap-1.5 w-48 mx-auto">
        {board.map((cell, i) => (
          <button key={i} onClick={() => handleClick(i)} disabled={!isMyTurn || !!cell || !!winner}
            className={`w-14 h-14 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xl font-bold flex items-center justify-center transition ${
              cell === "X" ? "text-[var(--accent)]" : "text-blue-500"
            } ${isMyTurn && !cell && !winner ? "hover:bg-[var(--muted)]" : ""}`}>
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}
