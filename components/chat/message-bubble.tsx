"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { MoreHorizontal, Pin, Trash2, Copy, Edit3, X } from "lucide-react";
import type { Message } from "@/types";

const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "✨"];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  decryptedContent?: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forBoth: boolean) => void;
  onPin: (msg: Message) => void;
  onCopy: (text: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageBubble({
  message,
  isOwn,
  decryptedContent,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  onReact,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const isVault = !!message.vault_id;
  const content = decryptedContent || message.content_encrypted;

  if (message.is_deleted && !message.deleted_for_both && !isOwn) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`group relative flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
    >
      <div className={`relative max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {/* Sender name for partner messages */}
        {!isOwn && message.sender && (
          <span className="text-[10px] text-white/30 mb-1 ml-1">{message.sender.display_name}</span>
        )}

        {/* Bubble */}
        <div
          onClick={() => setShowReactions(false)}
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "message-bubble-own rounded-br-md"
              : "message-bubble-partner rounded-bl-md"
          } ${message.is_deleted ? "opacity-50 italic" : ""}`}
        >
          {/* Reply indicator */}
          {message.reply_to_id && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-black/20 text-xs text-white/60 border-l-2 border-[#FF6B8A]/50">
              Replying to message
            </div>
          )}

          {message.is_deleted ? (
            <span className="text-white/40">This message was deleted</span>
          ) : (
            <>
              <p className="break-words whitespace-pre-wrap">{content}</p>
              {message.is_edited && (
                <span className="text-[10px] opacity-60 ml-1">(edited)</span>
              )}
            </>
          )}

          {/* Pinned badge */}
          {message.pinned && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF6B8A] flex items-center justify-center">
              <Pin className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-[10px] text-white/25">
            {format(new Date(message.created_at), "h:mm a")}
          </span>
          {isVault && (
            <span className="text-[10px] text-[#a78bfa]/60 bg-[#a78bfa]/10 px-1.5 py-0.5 rounded-full">
              Only You
            </span>
          )}
          {!isVault && (
            <span className="text-[10px] text-white/20">Both</span>
          )}
        </div>

        {/* Reactions */}
        {Object.entries(message.reactions || {}).filter(([, ids]) => (ids as string[]).length > 0).length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {Object.entries(message.reactions)
              .filter(([, ids]) => (ids as string[]).length > 0)
              .map(([emoji, ids]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs hover:bg-white/[0.08] transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="text-white/50">{(ids as string[]).length}</span>
                </button>
              ))}
          </div>
        )}

        {/* Hover menu button */}
        {!message.is_deleted && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowReactions(false); }}
            className="absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ [isOwn ? "left" : "right"]: "-28px" }}
          >
            <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1]">
              <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
            </div>
          </button>
        )}

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-20 top-8 bg-[#1a1a3e]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
              style={{ [isOwn ? "right" : "left"]: 0, minWidth: "160px" }}
            >
              <button onClick={() => { onReply(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                <span className="text-xs">↩️</span> Reply
              </button>
              <button onClick={() => { onCopy(content); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              {isOwn && (
                <>
                  <button onClick={() => { onEdit(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { onPin(message); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                    <Pin className="w-3.5 h-3.5" /> {message.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => { onDelete(message, false); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete for me
                  </button>
                  <button onClick={() => { onDelete(message, true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete for both
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 px-2 py-1.5 rounded-full bg-[#1a1a3e]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { onReact(message.id, r); setShowReactions(false); }}
                  className="w-8 h-8 rounded-full hover:bg-white/[0.1] flex items-center justify-center text-lg transition-colors"
                >
                  {r}
                </button>
              ))}
              <button onClick={() => setShowReactions(false)} className="w-8 h-8 rounded-full hover:bg-white/[0.1] flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
