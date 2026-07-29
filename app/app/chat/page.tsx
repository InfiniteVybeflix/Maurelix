"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/hooks/use-messages";
import { useEncryption } from "@/hooks/use-encryption";
import { uploadAttachment } from "@/lib/storage";
import { askSyne } from "@/lib/syne";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import SearchBar from "@/components/chat/search-bar";
import SyneChat from "@/components/syne/syne-chat";
import EmpathyGuard from "@/components/syne/empathy-guard";
import CallModal from "@/components/webrtc/call-modal";
import HapticWidget from "@/components/haptic-widget";
import GratitudeButton from "@/components/gratitude/gratitude-button";
import AudioVault from "@/components/vault/audio-vault";
import CooldownTrigger from "@/components/cooldown/cooldown-trigger";
import WrappedView from "@/components/wrapped/wrapped-view";
import { Message, Profile, Couple, Quest, GratitudeItem, MemoryPin } from "@/types";
import { Heart, Phone, Video, Shield, MessageCircle, Settings, Gamepad2, Gift, Sparkles, Menu, X, Bell, Mic } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [activeTab, setActiveTab] = useState<"shared" | "vault">("shared");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [empathyCheck, setEmpathyCheck] = useState<{ original: string; suggestion: string; explanation: string } | null>(null);
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAudioVault, setShowAudioVault] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, setWrappedData] = useState<{ messages: Message[]; quests: Quest[]; gratitude: GratitudeItem[]; pins: MemoryPin[] }>({ messages: [], quests: [], gratitude: [], pins: [] });
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { encrypt, decrypt, loading: cryptoLoading } = useEncryption();
  const { messages, loading: messagesLoading, sendMessage, editMessage, deleteMessage, pinMessage, addReaction } = useMessages(couple?.id || null, vaultId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
      supabase.from("couples").select("*").or(`user_a_id.eq.${authUser.id},user_b_id.eq.${authUser.id}`).single().then(({ data }) => {
        if (data) {
          setCouple(data);
          const partnerId = data.user_a_id === authUser.id ? data.user_b_id : data.user_a_id;
          if (partnerId) {
            supabase.from("profiles").select("*").eq("id", partnerId).single().then(({ data: p }) => {
              if (p) setPartner(p);
            });
          }
        }
      });
      supabase.from("vaults").select("id").eq("user_id", authUser.id).single().then(({ data }) => {
        if (data) setVaultId(data.id);
        else {
          supabase.from("vaults").insert({ user_id: authUser.id, encryption_key_salt: "salt" }).select().single().then(({ data: newVault }) => {
            if (newVault) setVaultId(newVault.id);
          });
        }
      });
      supabase.from("notifications").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => {
        if (data) setNotifications(data);
      });
    });
  }, [router, supabase]);

  useEffect(() => {
    async function decryptAll() {
      if (cryptoLoading) return;
      for (const msg of messages) {
        if (!msg.decrypted_content && msg.content_nonce && msg.content_encrypted_key) {
          const decrypted = await decrypt(msg.content_encrypted, msg.content_encrypted_key, msg.content_nonce);
          if (decrypted) msg.decrypted_content = decrypted;
        }
      }
    }
    decryptAll();
  }, [messages, decrypt, cryptoLoading]);

  const handleSend = async (text: string, attachmentId?: string) => {
    if (!text.trim() && !attachmentId) return;
    let payload: { encryptedContent: string; encryptedKey: string; nonce: string } | undefined;
    if (text.trim()) {
      const encrypted = await encrypt(text.trim(), activeTab === "vault");
      if (!encrypted) return;
      payload = encrypted;
    }
    await sendMessage(text.trim(), attachmentId, replyTo?.id, payload);
    setReplyTo(null);
    setEditingMessage(null);
  };

  const handleEdit = async (msg: Message) => {
    setEditingMessage(msg);
  };

  const handleEditConfirm = async (text: string) => {
    if (!editingMessage) return;
    const encrypted = await encrypt(text, activeTab === "vault");
    if (encrypted) {
      await editMessage(editingMessage.id, text, encrypted);
    }
    setEditingMessage(null);
  };

  const handleAttachment = async (file: File) => {
    if (!couple) return null;
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "video";
    const result = await uploadAttachment(file, type, couple.id);
    if (!result) return null;
    const { data: attachment } = await supabase.from("attachments").insert({
      uploader_id: user?.id,
      file_type: type,
      storage_path: result.path,
      thumbnail_path: result.thumbnailPath || null,
    }).select().single();
    return attachment?.id || null;
  };

  const handleEmpathy = async (text: string) => {
    const result = await askSyne(
      [{ role: "user", content: `Analyze this message for empathy: "${text}". Return JSON with sentiment_score (number), is_harmful (boolean), suggestion (string), explanation (string).` }],
      { mode: "empathy" }
    );
    if (result && (result.is_harmful || (result.sentiment_score !== undefined && result.sentiment_score < -0.4))) {
      setEmpathyCheck({ original: text, suggestion: result.suggestion || text, explanation: result.explanation || "" });
      return false;
    }
    return true;
  };

  const handleSendWithEmpathy = async (text: string, attachmentId?: string) => {
    if (!text.trim() || activeTab === "vault") {
      await handleSend(text, attachmentId);
      return;
    }
    const ok = await handleEmpathy(text);
    if (ok) await handleSend(text, attachmentId);
  };

  const startCall = (type: "audio" | "video") => {
    setCallType(type);
    setShowCall(true);
  };

  const loadWrapped = async () => {
    if (!couple) return;
    const { data: msgs } = await supabase.from("messages").select("*").eq("couple_id", couple.id);
    const { data: qsts } = await supabase.from("quests").select("*").eq("couple_id", couple.id);
    const { data: grads } = await supabase.from("gratitude_jar").select("*").eq("couple_id", couple.id);
    const { data: pns } = await supabase.from("memory_pins").select("*").eq("couple_id", couple.id);
    setWrappedData({ messages: msgs || [], quests: qsts || [], gratitude: grads || [], pins: pns || [] });
    setShowWrapped(true);
  };

  const markNotifRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center overflow-hidden">
            {partner?.avatar_url ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" /> : <Heart className="w-5 h-5 text-[var(--accent)]" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold">{partner?.display_name || "Partner"}</h2>
            <p className="text-[10px] text-[var(--muted-foreground)]">{activeTab === "shared" ? "Shared Space" : "Private Vault"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <SearchBar messages={messages} onSelect={() => {}} />
          <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-[var(--muted)] transition relative">
            <Bell className="w-5 h-5 text-[var(--muted-foreground)]" />
            {notifications.some((n) => !n.read) && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />}
          </button>
          <button onClick={() => startCall("audio")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><Phone className="w-5 h-5 text-[var(--muted-foreground)]" /></button>
          <button onClick={() => startCall("video")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><Video className="w-5 h-5 text-[var(--muted-foreground)]" /></button>
          <CooldownTrigger active={cooldownActive} onActivate={() => { setCooldownActive(true); setCooldownEnd(new Date(Date.now() + 20 * 60 * 1000)); }} />
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><Menu className="w-5 h-5 text-[var(--muted-foreground)]" /></button>
        </div>

        {showNotifications && (
          <div className="absolute top-14 right-4 z-40 w-72 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-3 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold">Notifications</h3>
              <button onClick={() => setShowNotifications(false)} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-3 h-3" /></button>
            </div>
            {notifications.length === 0 && <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No notifications</p>}
            {notifications.map((n) => (
              <button key={n.id} onClick={() => markNotifRead(n.id)} className={`w-full text-left p-2 rounded-lg mb-1 text-xs ${n.read ? "opacity-50" : "bg-[var(--muted)]"}`}>
                <p className="font-medium">{n.title}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">{n.body}</p>
              </button>
            ))}
          </div>
        )}

        {showMenu && (
          <div className="absolute top-14 right-4 z-40 w-56 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl py-2">
            <button onClick={() => { router.push("/app/settings"); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Settings className="w-4 h-4" /> Settings</button>
            <button onClick={() => { router.push("/app/games"); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Gamepad2 className="w-4 h-4" /> Games</button>
            <button onClick={() => { router.push("/app/cycle"); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Heart className="w-4 h-4" /> Cycle Tracker</button>
            <button onClick={() => { router.push("/app/maps"); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Gift className="w-4 h-4" /> Memory Map</button>
            <button onClick={() => { router.push("/app/quests"); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Sparkles className="w-4 h-4" /> Quests</button>
            <button onClick={() => { setShowAudioVault(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Mic className="w-4 h-4" /> Audio Vault</button>
            <button onClick={() => { loadWrapped(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--muted)] transition"><Sparkles className="w-4 h-4" /> Relationship Wrapped</button>
          </div>
        )}
      </header>

      <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] shrink-0">
        <button onClick={() => setActiveTab("shared")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${activeTab === "shared" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] border border-[var(--border)]"}`}>
          <MessageCircle className="w-3.5 h-3.5" /> Shared Space
        </button>
        <button onClick={() => setActiveTab("vault")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${activeTab === "vault" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] border border-[var(--border)]"}`}>
          <Shield className="w-3.5 h-3.5" /> My Vault
        </button>
      </div>

      {cooldownActive && cooldownEnd && (
        <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-orange-600 font-medium">Cool-down mode active</span>
          </div>
          <span className="text-xs text-orange-600 font-mono">{Math.max(0, Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000 / 60))}m left</span>
        </div>
      )}

      <MessageList
        messages={messages}
        currentUserId={user.id}
        partner={partner}
        onReply={setReplyTo}
        onEdit={handleEdit}
        onDelete={(msg, both) => deleteMessage(msg.id, both)}
        onPin={(msg) => pinMessage(msg.id, !msg.pinned)}
        onCopy={(text) => navigator.clipboard.writeText(text)}
        onReact={addReaction}
      />

      <MessageInput
        onSend={handleSendWithEmpathy}
        onAttachment={handleAttachment}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        disabled={cooldownActive}
      />

      {empathyCheck && (
        <EmpathyGuard
          original={empathyCheck.original}
          suggestion={empathyCheck.suggestion}
          explanation={empathyCheck.explanation}
          onUseSuggestion={() => { handleSend(empathyCheck.suggestion); setEmpathyCheck(null); }}
          onSendOriginal={() => { handleSend(empathyCheck.original); setEmpathyCheck(null); }}
          onDismiss={() => setEmpathyCheck(null)}
        />
      )}

      {showCall && couple && partner && (
        <CallModal coupleId={couple.id} partnerId={partner.id} callType={callType} onClose={() => setShowCall(false)} />
      )}

      {showAudioVault && couple && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Audio Vault</h3>
              <button onClick={() => setShowAudioVault(false)} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-4 h-4" /></button>
            </div>
            <AudioVault coupleId={couple.id} />
          </div>
        </div>
      )}

      {showWrapped && (
        <WrappedView {...wrappedData} onClose={() => setShowWrapped(false)} />
      )}

      <SyneChat coupleId={couple?.id} vaultMode={activeTab === "vault"} />
      <HapticWidget partnerId={partner?.id} />
      {couple && partner && <GratitudeButton coupleId={couple.id} partnerId={partner.id} />}
    </div>
  );
}
