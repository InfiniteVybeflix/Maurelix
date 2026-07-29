"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X, Smile } from "lucide-react";
import { Message } from "@/types";

interface MessageInputProps {
  onSend: (text: string, attachmentId?: string) => void;
  onAttachment: (file: File) => Promise<string | null>;
  replyTo: Message | null;
  onCancelReply: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onAttachment, replyTo, onCancelReply, editingMessage, onCancelEdit, disabled }: MessageInputProps) {
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
    <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3">
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-[var(--muted)] text-xs">
          <span className="text-[var(--muted-foreground)] truncate">
            {editingMessage ? "Editing message" : `Replying to: ${(replyTo?.decrypted_content || replyTo?.content_encrypted || "").slice(0, 40)}...`}
          </span>
          <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-1 hover:bg-[var(--border)] rounded-full transition">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[var(--muted)] transition shrink-0">
          <Paperclip className="w-5 h-5 text-[var(--muted-foreground)]" />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} accept="image/*,audio/*,video/*" />
        <div className="flex-1 relative">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat is locked..." : "Type a message..."}
            disabled={disabled || sending}
            rows={1}
            className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] max-h-32 scrollbar-hide"
            style={{ height: "auto", minHeight: "40px" }}
          />
        </div>
        <button onClick={handleSend} disabled={!text.trim() || sending || disabled}
          className="p-2.5 rounded-full bg-[var(--accent)] text-white hover:opacity-90 transition disabled:opacity-50 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
