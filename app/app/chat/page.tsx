"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Video, MoreVertical, Sparkles, Lock, Settings, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMessages } from "@/hooks/use-messages";
import { useEncryption } from "@/hooks/use-encryption";
import { useHaptic } from "@/components/haptic-widget";
import MessageList from "@/components/chat/message-list";
import MessageInput from "@/components/chat/message-input";
import SearchBar from "@/components/chat/search-bar";
import SyneChat from "@/components/syne/syne-chat";
import EmpathyGuard from "@/components/syne/empathy-guard";
import CallModal from "@/components/webrtc/call-modal";
import AudioVault from "@/components/vault/audio-vault";
import CooldownTrigger from "@/components/cooldown/cooldown-trigger";
import GratitudeButton from "@/components/gratitude/gratitude-button";
import { askSyne } from "@/lib/syne";
import { uploadAttachment } from "@/lib/storage";
import type { Message } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const { tap, success } = useHaptic();
  const [user, setUser] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vaultMode, setVaultMode] = useState(false);
  const [showSyne, setShowSyne] = useState(false);
  const [showAudioVault, setShowAudioVault] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [empathyCheck, setEmpathyCheck] = useState<any>(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});

  const { messages, loading, sendMessage, editMessage, deleteMessage, pinMessage, addReaction } =
    useMessages(couple?.id, vaultMode ? profile?.vault_id : null);
  const { encrypt, decrypt, hasKeys } = useEncryption();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("profiles").select("*").eq("id", u.id).single().then(({ data }) => {
        setProfile(data);
        if (!data?.partner_id) { router.push("/onboarding"); return; }
        supabase.from("profiles").select("*").eq("id", data.partner_id).single().then(({ data: p }) => setPartner(p));
        supabase.from("couples").select("*").or(`user_a_id.eq.${u.id},user_b_id.eq.${u.id}`).single().then(({ data: c }) => setCouple(c));
      });
    });
  }, [router, supabase]);

  // Decrypt messages
  useEffect(() => {
    if (!hasKeys) return;
    messages.forEach(async (msg) => {
      if (decryptedMap[msg.id]) return;
      if (msg.content_encrypted_key) {
        const d = await decrypt(msg.content_encrypted, msg.content_encrypted_key, msg.content_nonce);
        if (d) setDecryptedMap((prev) => ({ ...prev, [msg.id]: d }));
      } else {
        setDecryptedMap((prev) => ({ ...prev, [msg.id]: msg.content_encrypted }));
      }
    });
  }, [messages, decrypt, hasKeys, decryptedMap]);

  const handleSend = async (text: string, attachmentId?: string) => {
    if (!text.trim() && !attachmentId) return;
    try {
      tap();

      if (text.trim()) {
        const empathy = await askSyne([{ role: "user", content: text }], { mode: "empathy" });
        if (empathy?.is_harmful && empathy.suggestion) {
          setEmpathyCheck({ original: text, ...empathy });
          return;
        }
      }

      let encryptedPayload: { encryptedContent: string; encryptedKey: string; nonce: string } | undefined;
      if (text.trim() && encrypt) {
        const enc = await encrypt(text.trim(), vaultMode);
        if (enc) encryptedPayload = enc;
      }

      if (editingMessage) {
        await editMessage(editingMessage.id, text, encryptedPayload);
        setEditingMessage(null);
      } else {
        await sendMessage(text, attachmentId, replyTo?.id, encryptedPayload);
        setReplyTo(null);
      }
      success();
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const handleAttachment = async (file: File): Promise<string | null> => {
    if (!couple) return null;
    try {
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "video";
      const result = await uploadAttachment(file, type, couple.id);
      if (!result) return null;
      const { data } = await supabase.from("attachments").insert({
        uploader_id: user.id,
        file_type: type,
        storage_path: result.path,
        thumbnail_path: result.thumbnailPath,
      }).select().single();
      return data?.id || null;
    } catch (err) {
      console.error("Attachment upload error:", err);
      return null;
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter((m) => (decryptedMap[m.id] || m.content_encrypted).toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const remainingCooldown = cooldownEnd ? Math.max(0, Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000)) : 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {partner?.avatar_url ? (
              <img src={partner.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center text-white font-bold text-sm">
                {partner?.display_name?.[0] || "?"}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a1a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{partner?.display_name || "Partner"}</p>
            <p className="text-[10px] text-white/30">{vaultMode ? "Private Vault" : "Shared Space"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <SearchBar onSearch={setSearchQuery} />
          <button onClick={() => setVaultMode(!vaultMode)} className={`p-2.5 rounded-xl transition-colors ${vaultMode ? "bg-[#a78bfa]/15 text-[#a78bfa]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}>
            <Lock className="w-5 h-5" />
          </button>
          <button onClick={() => setCallType("audio")} className="p-2.5 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={() => setCallType("video")} className="p-2.5 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSyne(!showSyne)} className={`p-2.5 rounded-xl transition-colors ${showSyne ? "bg-[#FF6B8A]/15 text-[#FF6B8A]" : "text-white/30 hover:text-white/60 hover:bg-white/[0.05]"}`}>
            <Sparkles className="w-5 h-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 rounded-xl hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 top-12 w-48 rounded-xl glass shadow-2xl border border-white/10 overflow-hidden z-30"
                >
                  <button onClick={() => { setShowAudioVault(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2">
                    🎙️ Audio Vault
                  </button>
                  <button onClick={() => { router.push("/app/settings"); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={filteredMessages}
        currentUserId={user?.id || ""}
        decryptedMap={decryptedMap}
        onReply={setReplyTo}
        onEdit={setEditingMessage}
        onDelete={deleteMessage}
        onPin={pinMessage}
        onCopy={(text) => { navigator.clipboard.writeText(text); success(); }}
        onReact={addReaction}
      />

      {/* Empathy Guard */}
      <AnimatePresence>
        {empathyCheck && (
          <EmpathyGuard
            original={empathyCheck.original}
            empathyCheck={empathyCheck}
            onSendSuggestion={() => {
              setEmpathyCheck(null);
              handleSend(empathyCheck.suggestion || empathyCheck.content);
            }}
            onSendOriginal={() => {
              setEmpathyCheck(null);
              handleSend(empathyCheck.original);
            }}
            onDismiss={() => setEmpathyCheck(null)}
          />
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 px-4 py-2">
          <GratitudeButton coupleId={couple?.id || ""} partnerId={partner?.id || ""} />
          <CooldownTrigger
            onActivate={() => {
              const end = new Date(Date.now() + 20 * 60 * 1000);
              setCooldownEnd(end);
              setCooldownActive(true);
              setTimeout(() => setCooldownActive(false), 20 * 60 * 1000);
            }}
            active={cooldownActive}
            remainingMinutes={remainingCooldown}
          />
        </div>
        <MessageInput
          onSend={handleSend}
          onAttachment={handleAttachment}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          disabled={cooldownActive}
        />
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showSyne && <SyneChat onClose={() => setShowSyne(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAudioVault && <AudioVault coupleId={couple?.id || ""} onClose={() => setShowAudioVault(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {callType && couple && partner && (
          <CallModal
            coupleId={couple.id}
            partnerId={partner.id}
            callType={callType}
            onClose={() => setCallType(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
