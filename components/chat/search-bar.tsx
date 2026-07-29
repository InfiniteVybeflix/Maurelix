"use client";

import { useState, useMemo } from "react";
import { Message } from "@/types";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  messages: Message[];
  onSelect: (msg: Message) => void;
}

export default function SearchBar({ messages, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages.filter((m) => (m.decrypted_content || m.content_encrypted).toLowerCase().includes(q)).slice(0, 10);
  }, [query, messages]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="p-2 rounded-full hover:bg-[var(--muted)] transition">
        <Search className="w-5 h-5 text-[var(--muted-foreground)]" />
      </button>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-[var(--background)] border-b border-[var(--border)] px-4 py-2">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-[var(--muted-foreground)]" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-sm focus:outline-none" />
        <button onClick={() => { setOpen(false); setQuery(""); }} className="p-1 rounded-full hover:bg-[var(--muted)] transition">
          <X className="w-4 h-4" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
          {results.map((msg) => (
            <button key={msg.id} onClick={() => { onSelect(msg); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs hover:bg-[var(--muted)] transition truncate">
              {(msg.decrypted_content || msg.content_encrypted).slice(0, 60)}...
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
