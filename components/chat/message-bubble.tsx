"use client";

import { useState } from "react";
import { Message, Profile } from "@/types";
import { format } from "date-fns";
import { Edit2, Trash2, Pin, Copy, Reply, MoreVertical, Heart, Flame, Smile, Frown, Zap } from "lucide-react";

const REACTIONS = [
  { emoji: "❤️", icon: Heart },
  { emoji: "😂", icon: Smile },
  { emoji: "🔥", icon: Flame },
  { emoji: "😮", icon: Zap },
  { emoji: "😢", icon: Frown },
];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  partner: Profile | null;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forBoth: boolean) => void;
  onPin: (msg: Message) => void;
  onCopy: (text: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageBubble({ message, isOwn, partner, onReply, onEdit, onDelete, onPin, onCopy, onReact }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  if (message.deleted_for_both) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[var(--muted-foreground)] italic px-3 py-1 rounded-full bg-[var(--muted)]">This message was deleted</span>
      </div>
    );
  }

  if (message.is_deleted && !isOwn) return null;
  if (message.is_deleted && isOwn) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} my-1`}>
        <div className="max-w-[75%] px-4 py-2 rounded-2xl bg-[var(--muted)] opacity-50">
          <span className="text-xs text-[var(--muted-foreground)] italic">You deleted this message</span>
        </div>
      </div>
    );
  }

  const content = message.decrypted_content || message.content_encrypted;
  const isVault = !!message.vault_id;
  const sender = message.sender as Profile | undefined;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} my-1 group relative`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative ${isOwn ? "bg-[var(--accent)] text-white rounded-br-md" : "bg-[var(--card)] border border-[var(--border)] rounded-bl-md"}`}>
        {message.reply_to_id && (
          <div className={`text-xs mb-1 pb-1 border-b ${isOwn ? "border-white/20 text-white/70" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
            Replying to message
          </div>
        )}
        {message.pinned && <Pin className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        {message.is_edited && <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-[var(--muted-foreground)]"}`}> (edited)</span>}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-[var(--muted-foreground)]"}`}>{format(new Date(message.created_at), "h:mm a")}</span>
          {isVault && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOwn ? "bg-white/20" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}>Only You</span>
          )}
          {!isVault && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOwn ? "bg-white/20" : "bg-green-500/10 text-green-600"}`}>Both</span>
          )}
        </div>

        {Object.entries(message.reactions || {}).filter(([, ids]) => ids.length > 0).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(message.reactions).filter(([, ids]) => ids.length > 0).map(([emoji, ids]) => (
              <button key={emoji} onClick={() => onReact(message.id, emoji)}
                className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--accent)]/10 transition">
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => setShowMenu(!showMenu)}
          className={`absolute top-1 ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} opacity-0 group-hover:opacity-100 transition`}>
          <MoreVertical className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>

        {showMenu && (
          <div className={`absolute z-20 ${isOwn ? "right-0" : "left-0"} top-8 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[140px]`}>
            <button onClick={() => { onReply(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition"><Reply className="w-3 h-3" /> Reply</button>
            {isOwn && <button onClick={() => { onEdit(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition"><Edit2 className="w-3 h-3" /> Edit</button>}
            <button onClick={() => { onCopy(content); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition"><Copy className="w-3 h-3" /> Copy</button>
            <button onClick={() => { onPin(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition"><Pin className="w-3 h-3" /> {message.pinned ? "Unpin" : "Pin"}</button>
            {isOwn && <button onClick={() => { onDelete(message, false); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition text-orange-500"><Trash2 className="w-3 h-3" /> Delete for Me</button>}
            {isOwn && <button onClick={() => { onDelete(message, true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[var(--muted)] transition text-red-500"><Trash2 className="w-3 h-3" /> Delete for Both</button>}
          </div>
        )}

        {showReactions && (
          <div className={`absolute z-20 ${isOwn ? "right-0" : "left-0"} -bottom-10 bg-[var(--card)] border border-[var(--border)] rounded-full shadow-lg px-2 py-1 flex gap-1`}>
            {REACTIONS.map((r) => (
              <button key={r.emoji} onClick={() => { onReact(message.id, r.emoji); setShowReactions(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--muted)] transition text-sm">
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => setShowReactions(!showReactions)}
          className={`absolute -bottom-3 ${isOwn ? "left-2" : "right-2"} opacity-0 group-hover:opacity-100 transition`}>
          <Heart className="w-3 h-3 text-[var(--muted-foreground)]" />
        </button>
      </div>
    </div>
  );
}
