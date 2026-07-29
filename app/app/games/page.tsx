"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GameSession, Profile } from "@/types";
import TicTacToe from "@/components/games/tic-tac-toe";
import ConnectFour from "@/components/games/connect-four";
import SyncQuiz from "@/components/games/sync-quiz";
import { ArrowLeft, Gamepad2, Grid3X3, CircleDot, Brain, Plus } from "lucide-react";

export default function GamesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<Profile | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
      supabase.from("couples").select("*").or(`user_a_id.eq.${authUser.id},user_b_id.eq.${authUser.id}`).single().then(({ data }) => {
        if (data) {
          setCoupleId(data.id);
          loadGames(data.id);
        }
      });
    });
  }, [router, supabase]);

  const loadGames = async (cid: string) => {
    const { data } = await supabase.from("game_sessions").select("*").eq("couple_id", cid).order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const createGame = async (type: "tic_tac_toe" | "connect_4" | "sync_quiz") => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !coupleId) return;
    const { data: couple } = await supabase.from("couples").select("user_a_id, user_b_id").eq("id", coupleId).single();
    const partnerId = couple?.user_a_id === authUser.id ? couple?.user_b_id : couple?.user_a_id;
    const initialState = type === "tic_tac_toe"
      ? { board: Array(9).fill(null), xPlayer: authUser.id, oPlayer: partnerId }
      : type === "connect_4"
      ? { board: Array(6).fill(null).map(() => Array(7).fill(null)), rPlayer: authUser.id, yPlayer: partnerId }
      : { question: "", options: [], answers: {}, revealed: false };
    const { data } = await supabase.from("game_sessions").insert({
      couple_id: coupleId,
      game_type: type,
      state: initialState,
      current_turn: authUser.id,
    }).select().single();
    if (data) {
      setSessions((prev) => [data, ...prev]);
      setActiveGame(data);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Games</h1>
      </header>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {!activeGame && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => createGame("tic_tac_toe")} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-[var(--muted)] transition">
                <Grid3X3 className="w-6 h-6 text-[var(--accent)]" />
                <span className="text-xs font-medium">Tic-Tac-Toe</span>
              </button>
              <button onClick={() => createGame("connect_4")} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-[var(--muted)] transition">
                <CircleDot className="w-6 h-6 text-blue-500" />
                <span className="text-xs font-medium">Connect 4</span>
              </button>
              <button onClick={() => createGame("sync_quiz")} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-[var(--muted)] transition">
                <Brain className="w-6 h-6 text-purple-500" />
                <span className="text-xs font-medium">Sync Quiz</span>
              </button>
            </div>
            <h3 className="text-sm font-semibold">Active Games</h3>
            {sessions.length === 0 && <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No active games. Create one above!</p>}
            {sessions.map((s) => (
              <button key={s.id} onClick={() => setActiveGame(s)} className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between hover:bg-[var(--muted)] transition">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="w-5 h-5 text-[var(--accent)]" />
                  <div className="text-left">
                    <p className="text-xs font-semibold capitalize">{s.game_type.replace("_", " ")}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{s.winner_id ? "Finished" : "In progress"}</p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-[var(--muted-foreground)] rotate-45" />
              </button>
            ))}
          </>
        )}
        {activeGame && user && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold capitalize">{activeGame.game_type.replace("_", " ")}</h3>
              <button onClick={() => setActiveGame(null)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Back to list</button>
            </div>
            {activeGame.game_type === "tic_tac_toe" && <TicTacToe session={activeGame} userId={user.id} onUpdate={setActiveGame} />}
            {activeGame.game_type === "connect_4" && <ConnectFour session={activeGame} userId={user.id} onUpdate={setActiveGame} />}
            {activeGame.game_type === "sync_quiz" && <SyncQuiz session={activeGame} userId={user.id} onUpdate={setActiveGame} />}
          </div>
        )}
      </div>
    </div>
  );
}
