"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Mic, Image as ImageIcon } from "lucide-react";
import type { Message } from "@/types";

interface MessageInputProps {
  onSend: (text: string, attachmentId?: string) => Promise<void>;
  onAttachment: (file: File) => Promise<string | null>;
  replyTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSend,
  onAttachment,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!text.trim() || disabled) return;
    setSending(true);
    await onSend(text.trim());
    setText("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    const attachmentId = await onAttachment(file);
    if (attachmentId) await onSend("", attachmentId);
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {(replyTo || editingMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1 h-8 rounded-full bg-[#FF6B8A]" />
              <div className="min-w-0">
                <p className="text-[10px] text-[#FF6B8A] font-medium">
                  {editingMessage ? "Editing message" : "Replying to"}
                </p>
                <p className="text-xs text-white/40 truncate">
                  {(editingMessage?.decrypted_content || replyTo?.decrypted_content || replyTo?.content_encrypted || "").slice(0, 50)}...
                </p>
              </div>
            </div>
            <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 px-4 pb-4 pt-2">
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Cool-down active..." : "Type a message..."}
            disabled={disabled || sending}
            rows={1}
            className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/30 focus:ring-1 focus:ring-[#FF6B8A]/10 resize-none transition-all scrollbar-hide"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*" className="hidden" onChange={handleFile} />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled || sending}
          className="w-12 h-12 rounded-2xl flex items-center justify-center btn-glow shrink-0 disabled:opacity-30 disabled:hover:transform-none"
          style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
