"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import FeedbackModal from "@/components/feedback/feedback-modal";
import { Profile } from "@/types";
import { ArrowLeft, Moon, Sun, LogOut, User, MessageSquare, Shield, Bell, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<Profile | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
    });
    if ("Notification" in window) setPushEnabled(Notification.permission === "granted");
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const requestPush = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setPushEnabled(perm === "granted");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>
      <div className="p-4 max-w-lg mx-auto space-y-3">
        {user && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center overflow-hidden">
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-[var(--muted-foreground)]" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{user.display_name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{user.is_admin ? "Admin" : "Member"}</p>
            </div>
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
            {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-[var(--accent)]" />}
            <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button onClick={requestPush} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
            <Bell className={`w-5 h-5 ${pushEnabled ? "text-green-500" : "text-[var(--muted-foreground)]"}`} />
            <span className="text-sm font-medium">Push Notifications {pushEnabled ? "(On)" : "(Off)"}</span>
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button onClick={() => router.push("/app/cycle")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
            <Shield className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-sm font-medium">Cycle Tracker</span>
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button onClick={() => router.push("/app/maps")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
            <MessageSquare className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Memory Map</span>
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button onClick={() => setShowFeedback(true)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">Send Feedback</span>
          </button>
          {user?.is_admin && (
            <>
              <div className="h-px bg-[var(--border)]" />
              <button onClick={() => router.push("/admin")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition">
                <Shield className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Admin Dashboard</span>
              </button>
            </>
          )}
        </div>

        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/5 transition">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
