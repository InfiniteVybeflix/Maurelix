"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import MessageBubble from "./message-bubble";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  decryptedMap: Record<string, string>;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (messageId: string, forBoth: boolean) => void;
  onPin: (messageId: string, pinned: boolean) => void;
  onCopy: (text: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  decryptedMap,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  onReact,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💫</span>
          </div>
          <p className="text-white/30 text-sm">No messages yet</p>
          <p className="text-white/15 text-xs mt-1">Start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-glow">
      <div className="space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
            decryptedContent={decryptedMap[msg.id]}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onPin={onPin}
            onCopy={onCopy}
            onReact={onReact}
          />
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
