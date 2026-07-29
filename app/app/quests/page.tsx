"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Quest, Profile, TokenBalance } from "@/types";
import { ArrowLeft, Plus, Check, Gift, Star } from "lucide-react";

export default function QuestsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newQuest, setNewQuest] = useState({ title: "", description: "", reward: 1 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
      supabase.from("couples").select("*").or(`user_a_id.eq.${authUser.id},user_b_id.eq.${authUser.id}`).single().then(({ data: couple }) => {
        if (couple) {
          loadQuests(couple.id);
          const pid = couple.user_a_id === authUser.id ? couple.user_b_id : couple.user_a_id;
          if (pid) supabase.from("profiles").select("*").eq("id", pid).single().then(({ data }) => { if (data) setPartner(data); });
        }
      });
      supabase.from("token_balance").select("balance").eq("user_id", authUser.id).single().then(({ data }) => {
        if (data) setBalance(data.balance);
      });
    });
  }, [router, supabase]);

  const loadQuests = async (cid: string) => {
    const { data } = await supabase.from("quests").select("*").eq("couple_id", cid).order("created_at", { ascending: false });
    if (data) setQuests(data);
  };

  const addQuest = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: couple } = await supabase.from("couples").select("id").or(`user_a_id.eq.${authUser.id},user_b_id.eq.${authUser.id}`).single();
    if (!couple) return;
    const { data } = await supabase.from("quests").insert({
      couple_id: couple.id,
      title: newQuest.title,
      description: newQuest.description,
      token_reward: newQuest.reward,
      assigned_to: partner?.id,
    }).select().single();
    if (data) {
      setQuests((prev) => [data, ...prev]);
      setShowAdd(false);
      setNewQuest({ title: "", description: "", reward: 1 });
    }
  };

  const completeQuest = async (quest: Quest) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    await supabase.from("quests").update({ status: "completed", completed_by: authUser.id }).eq("id", quest.id);
    const { data: bal } = await supabase.from("token_balance").select("*").eq("user_id", authUser.id).single();
    if (bal) {
      await supabase.from("token_balance").update({ balance: bal.balance + quest.token_reward }).eq("id", bal.id);
      setBalance(bal.balance + quest.token_reward);
    } else {
      await supabase.from("token_balance").insert({ user_id: authUser.id, balance: quest.token_reward });
      setBalance(quest.token_reward);
    }
    setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, status: "completed", completed_by: authUser.id } : q));
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Quests</h1>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {balance}
        </div>
      </header>
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <button onClick={() => setShowAdd(true)} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Create Quest
        </button>
        {showAdd && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
            <input placeholder="Quest title" value={newQuest.title} onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <textarea placeholder="Description" value={newQuest.description} onChange={(e) => setNewQuest({ ...newQuest, description: e.target.value })} rows={2}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <div>
              <label className="text-[10px] text-[var(--muted-foreground)]">Token reward: {newQuest.reward}</label>
              <input type="range" min={1} max={10} value={newQuest.reward} onChange={(e) => setNewQuest({ ...newQuest, reward: parseInt(e.target.value) })} className="w-full accent-[var(--accent)]" />
            </div>
            <div className="flex gap-2">
              <button onClick={addQuest} disabled={!newQuest.title} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition disabled:opacity-50">Create</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--muted)] transition">Cancel</button>
            </div>
          </div>
        )}
        {quests.map((quest) => (
          <div key={quest.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{quest.title}</h3>
                {quest.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{quest.description}</p>}
                <div className="flex items-center gap-1 mt-2">
                  <Gift className="w-3 h-3 text-yellow-500" />
                  <span className="text-[10px] text-[var(--muted-foreground)]">{quest.token_reward} tokens</span>
                </div>
              </div>
              {quest.status === "open" && (
                <button onClick={() => completeQuest(quest)} className="p-2 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition">
                  <Check className="w-4 h-4" />
                </button>
              )}
              {quest.status === "completed" && <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-600">Completed</span>}
              {quest.status === "redeemed" && <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">Redeemed</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
