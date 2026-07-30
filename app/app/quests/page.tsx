"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, CheckCircle2, Gift, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SUGGESTIONS = [
  { title: "Cook dinner together", description: "Prepare a meal from scratch tonight", reward: 5 },
  { title: "30-min walk", description: "Go for a walk and talk about your day", reward: 3 },
  { title: "Write a love note", description: "Leave a handwritten note somewhere unexpected", reward: 4 },
  { title: "Plan a date night", description: "Plan something special for this weekend", reward: 7 },
  { title: "Give a compliment", description: "Tell your partner something you admire about them", reward: 2 },
];

export default function QuestsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newQuest, setNewQuest] = useState({ title: "", description: "", reward: 3 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("couples").select("*").or(`user_a_id.eq.${u.id},user_b_id.eq.${u.id}`).single().then(({ data: c }) => {
        setCouple(c);
        if (c) loadQuests(c.id, u.id);
      });
    });
  }, [router, supabase]);

  const loadQuests = async (coupleId: string, userId: string) => {
    const { data: q } = await supabase.from("quests").select("*").eq("couple_id", coupleId).order("created_at", { ascending: false });
    setQuests(q || []);
    const { data: balance } = await supabase.from("token_balance").select("balance").eq("user_id", userId).single();
    setTokenBalance(balance?.balance || 0);
  };

  const createQuest = async () => {
    if (!couple || !newQuest.title.trim()) return;
    await supabase.from("quests").insert({
      couple_id: couple.id,
      title: newQuest.title,
      description: newQuest.description,
      token_reward: newQuest.reward,
      assigned_to: couple.user_a_id === user.id ? couple.user_b_id : couple.user_a_id,
    });
    setNewQuest({ title: "", description: "", reward: 3 });
    setShowAdd(false);
    loadQuests(couple.id, user.id);
  };

  const completeQuest = async (quest: any) => {
    if (!user) return;
    await supabase.from("quests").update({ status: "completed", completed_by: user.id }).eq("id", quest.id);

    // Award tokens
    const { data: existing } = await supabase.from("token_balance").select("balance").eq("user_id", user.id).single();
    if (existing) {
      await supabase.from("token_balance").update({ balance: existing.balance + quest.token_reward }).eq("user_id", user.id);
    } else {
      await supabase.from("token_balance").insert({ user_id: user.id, balance: quest.token_reward });
    }

    loadQuests(couple.id, user.id);
  };

  return (
    <div className="min-h-screen pb-8" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Quests</h1>
          <p className="text-[10px] text-white/30">Earn tokens together</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20">
          <Coins className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span className="text-xs font-semibold text-[#fbbf24]">{tokenBalance}</span>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2.5 rounded-xl bg-[#FF6B8A]/15 text-[#FF6B8A] hover:bg-[#FF6B8A]/25 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        {quests.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No quests yet</p>
            <p className="text-white/15 text-xs mt-1">Create your first quest</p>
          </div>
        )}

        {quests.map((quest) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 border transition-all ${
              quest.status === "completed"
                ? "bg-white/[0.01] border-white/[0.04] opacity-50"
                : "bg-white/[0.02] border-white/[0.06]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-sm font-medium ${quest.status === "completed" ? "text-white/30 line-through" : "text-white"}`}>
                    {quest.title}
                  </h3>
                  {quest.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-xs text-white/30">{quest.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Coins className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span className="text-xs font-semibold text-[#fbbf24]">{quest.token_reward}</span>
              </div>
            </div>
            {quest.status !== "completed" && quest.assigned_to === user?.id && (
              <button
                onClick={() => completeQuest(quest)}
                className="mt-3 w-full py-2 rounded-xl text-xs font-medium text-white btn-glow"
                style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
              >
                Complete Quest
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md rounded-2xl glass shadow-2xl border border-white/10 p-5 space-y-4"
            >
              <h3 className="text-lg font-semibold text-white">New Quest</h3>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setNewQuest({ title: s.title, description: s.description, reward: s.reward })}
                    className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/40 hover:text-white/70 hover:border-white/10 transition-all text-left"
                  >
                    <p className="font-medium text-white/60">{s.title}</p>
                    <p className="text-[10px] mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newQuest.title}
                onChange={(e) => setNewQuest((p) => ({ ...p, title: e.target.value }))}
                placeholder="Quest title"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30"
              />
              <textarea
                value={newQuest.description}
                onChange={(e) => setNewQuest((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30 resize-none"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/30">Reward:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 5, 7, 10].map((r) => (
                    <button
                      key={r}
                      onClick={() => setNewQuest((p) => ({ ...p, reward: r }))}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        newQuest.reward === r
                          ? "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30"
                          : "bg-white/[0.02] text-white/30 border border-white/[0.06]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createQuest} className="w-full py-3 rounded-2xl text-white font-medium text-sm btn-glow" style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
                Create Quest
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
