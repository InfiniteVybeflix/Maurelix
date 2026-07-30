"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gamepad2, RotateCcw, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TicTacToe from "@/components/games/tic-tac-toe";
import ConnectFour from "@/components/games/connect-four";
import SyncQuiz from "@/components/games/sync-quiz";

const GAMES = [
  { id: "tic_tac_toe", name: "Tic Tac Toe", emoji: "⭕", color: "#FF6B8A" },
  { id: "connect_4", name: "Connect Four", emoji: "🔴", color: "#fbbf24" },
  { id: "sync_quiz", name: "Sync Quiz", emoji: "❓", color: "#60a5fa" },
];

export default function GamesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("couples").select("*").or(`user_a_id.eq.${u.id},user_b_id.eq.${u.id}`).single().then(({ data: c }) => {
        setCouple(c);
        if (c) {
          supabase.from("game_sessions").select("*").eq("couple_id", c.id).order("updated_at", { ascending: false }).then(({ data }) => {
            setSessions(data || []);
          });
        }
      });
    });
  }, [router, supabase]);

  const startGame = async (gameType: string) => {
    if (!couple || !user) return;
    const { data } = await supabase.from("game_sessions").insert({
      couple_id: couple.id,
      game_type: gameType,
      state: {},
      current_turn: user.id,
    }).select().single();
    if (data) {
      setSession(data);
      setActiveGame(gameType);
    }
  };

  const resumeGame = (s: any) => {
    setSession(s);
    setActiveGame(s.game_type);
  };

  return (
    <div className="min-h-screen pb-8" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Couple Games</h1>
          <p className="text-[10px] text-white/30">Play together</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {!activeGame ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {GAMES.map((game) => (
                <motion.button
                  key={game.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startGame(game.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all"
                >
                  <span className="text-3xl">{game.emoji}</span>
                  <span className="text-xs font-medium text-white/60">{game.name}</span>
                </motion.button>
              ))}
            </div>

            {sessions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white/60 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Active Games
                </h3>
                {sessions.filter((s) => !s.winner_id).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => resumeGame(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all text-left"
                  >
                    <span className="text-xl">{GAMES.find((g) => g.id === s.game_type)?.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-white">{GAMES.find((g) => g.id === s.game_type)?.name}</p>
                      <p className="text-xs text-white/30">{s.current_turn === user?.id ? "Your turn" : "Partner's turn"}</p>
                    </div>
                    <Trophy className="w-4 h-4 text-white/20" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => { setActiveGame(null); setSession(null); }} className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-sm font-semibold text-white">{GAMES.find((g) => g.id === activeGame)?.name}</h2>
            </div>
            {activeGame === "tic_tac_toe" && session && (
              <TicTacToe session={session} userId={user?.id} onUpdate={setSession} />
            )}
            {activeGame === "connect_4" && session && (
              <ConnectFour session={session} userId={user?.id} onUpdate={setSession} />
            )}
            {activeGame === "sync_quiz" && session && (
              <SyncQuiz session={session} userId={user?.id} onUpdate={setSession} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
