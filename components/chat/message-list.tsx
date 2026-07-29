"use client";

import { useRef, useEffect } from "react";
import { Message, Profile } from "@/types";
import MessageBubble from "./message-bubble";
import { format, isSameDay } from "date-fns";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  partner: Profile | null;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message, forBoth: boolean) => void;
  onPin: (msg: Message) => void;
  onCopy: (text: string) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageList({ messages, currentUserId, partner, onReply, onEdit, onDelete, onPin, onCopy, onReact }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  let lastDate: Date | null = null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
      {messages.map((msg) => {
        const msgDate = new Date(msg.created_at);
        const showDate = !lastDate || !isSameDay(msgDate, lastDate);
        lastDate = msgDate;
        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-[var(--muted-foreground)] px-3 py-1 rounded-full bg-[var(--muted)]">{format(msgDate, "MMMM d, yyyy")}</span>
              </div>
            )}
            <MessageBubble
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              partner={partner}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onCopy={onCopy}
              onReact={onReact}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
