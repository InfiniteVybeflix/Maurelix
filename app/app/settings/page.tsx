"use client";

import { useState, useEffect } from "react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Moon, Sun, Bell, Shield, Heart, User, Palette,
  LogOut, ChevronRight, Trash2, AlertTriangle,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";

// ── Types ──────────────────────────────────────────────────────────────
type SettingItem = {
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  label: string;
  value: string;
  action: () => void;
  colorPicker?: boolean;
  toggle?: boolean;
};

type Section = {
  title: string;
  items: SettingItem[];
};

// ── Component ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("profiles").select("*").eq("id", u.id).single().then(({ data }) => setProfile(data));
    });
  }, [router, supabase]);

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("id", user.id);
    setProfile((p: any) => ({ ...p, ...updates }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const sections: Section[] = [
    {
      title: "Appearance",
      items: [
        {
          icon: theme === "dark" ? Moon : Sun,
          label: "Theme",
          value: theme === "dark" ? "Dark" : "Light",
          action: toggleTheme,
        },
        {
          icon: Palette,
          label: "Accent Color",
          value: profile?.theme_color || "#FF6B8A",
          action: () => {},
          colorPicker: true,
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          value: notifications ? "On" : "Off",
          action: () => setNotifications(!notifications),
          toggle: true,
        },
        {
          icon: Heart,
          label: "Love Language",
          value: profile?.love_language || "Not set",
          action: () => {},
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Display Name",
          value: profile?.display_name || "—",
          action: () => {},
        },
        {
          icon: Shield,
          label: "Encryption PIN",
          value: "Change",
          action: () => { /* Navigate to PIN change */ },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-8" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        {/* Profile Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center text-white font-bold text-lg">
            {profile?.display_name?.[0] || "?"}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">{profile?.display_name || "User"}</p>
            <p className="text-xs text-white/30">{user?.email}</p>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-[10px] text-white/20 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] ${
                    i < section.items.length - 1 ? "border-b border-white/[0.04]" : ""
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5 text-white/30 shrink-0" style={{ width: "18px", height: "18px" }} />
                  <span className="text-sm text-white/70 flex-1">{item.label}</span>
                  {item.colorPicker ? (
                    <input
                      type="color"
                      value={profile?.theme_color || "#FF6B8A"}
                      onChange={(e) => updateProfile({ theme_color: e.target.value })}
                      className="w-6 h-6 rounded-full border-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-xs text-white/30 flex items-center gap-1">
                      {item.value}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div>
          <h3 className="text-[10px] text-red-400/40 uppercase tracking-wider mb-2 px-1">Danger Zone</h3>
          <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/[0.08] overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-500/[0.03] transition-colors"
            >
              <LogOut className="w-4.5 h-4.5 text-red-400/60 shrink-0" style={{ width: "18px", height: "18px" }} />
              <span className="text-sm text-red-400/70">Sign Out</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-500/[0.03] transition-colors border-t border-red-500/[0.04]"
            >
              <Trash2 className="w-4.5 h-4.5 text-red-400/60 shrink-0" style={{ width: "18px", height: "18px" }} />
              <span className="text-sm text-red-400/70">Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm rounded-2xl glass shadow-2xl border border-red-500/20 p-6 text-center"
          >
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Delete Account?</h3>
            <p className="text-sm text-white/40 mb-6">This action cannot be undone. All your data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
