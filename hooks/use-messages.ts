"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";

export function useMessages(coupleId: string | null, vaultId: string | null = null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    if (!coupleId) { setLoading(false); return; }
    setLoading(true);
    let query = supabase
      .from("messages")
      .select(`*, sender:profiles(id, display_name, avatar_url)`)
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true });

    if (vaultId) {
      query = query.not("vault_id", "is", null).eq("vault_id", vaultId);
    } else {
      query = query.is("vault_id", null);
    }

    const { data, error } = await query.limit(200);
    if (error) {
      console.error("fetchMessages error:", error);
    }
    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [coupleId, vaultId, supabase]);

  useEffect(() => {
    fetchMessages();
    if (!coupleId) return;

    const channel = supabase
      .channel(`messages:${coupleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          if (vaultId && !newMsg.vault_id) return;
          if (!vaultId && newMsg.vault_id) return;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId, vaultId, supabase, fetchMessages]);

  const sendMessage = useCallback(
    async (
      content: string,
      attachmentId?: string,
      replyToId?: string,
      encryptedPayload?: { encryptedContent: string; encryptedKey: string; nonce: string }
    ) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !coupleId) return null;

      const insert: Record<string, any> = {
        sender_id: user.id,
        couple_id: coupleId,
        content_encrypted: encryptedPayload?.encryptedContent || content,
        content_encrypted_key: encryptedPayload?.encryptedKey || null,
        content_nonce: encryptedPayload?.nonce || "",
        attachment_id: attachmentId || null,
        reply_to_id: replyToId || null,
        vault_id: vaultId || null,
      };

      const { data, error } = await supabase.from("messages").insert(insert).select().single();
      if (error) {
        console.error("sendMessage error:", error);
        return null;
      }
      return data as Message;
    },
    [coupleId, vaultId, supabase]
  );

  const editMessage = useCallback(
    async (
      messageId: string,
      content: string,
      encryptedPayload?: { encryptedContent: string; encryptedKey: string; nonce: string }
    ) => {
      const update: Record<string, any> = { is_edited: true };
      if (encryptedPayload) {
        update.content_encrypted = encryptedPayload.encryptedContent;
        update.content_encrypted_key = encryptedPayload.encryptedKey;
        update.content_nonce = encryptedPayload.nonce;
      } else {
        update.content_encrypted = content;
      }
      const { error } = await supabase.from("messages").update(update).eq("id", messageId);
      if (error) console.error("editMessage error:", error);
      return !error;
    },
    [supabase]
  );

  const deleteMessage = useCallback(
    async (messageId: string, forBoth: boolean) => {
      const update: Record<string, any> = { is_deleted: true };
      if (forBoth) update.deleted_for_both = true;
      const { error } = await supabase.from("messages").update(update).eq("id", messageId);
      if (error) console.error("deleteMessage error:", error);
    },
    [supabase]
  );

  const pinMessage = useCallback(
    async (messageId: string, pinned: boolean) => {
      const { error } = await supabase.from("messages").update({ pinned }).eq("id", messageId);
      if (error) console.error("pinMessage error:", error);
    },
    [supabase]
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const reactions: Record<string, string[]> = { ...(msg.reactions as Record<string, string[]> || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];

      if (reactions[emoji].includes(user.id)) {
        reactions[emoji] = reactions[emoji].filter((id) => id !== user.id);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji].push(user.id);
      }

      const { error } = await supabase.from("messages").update({ reactions }).eq("id", messageId);
      if (error) console.error("addReaction error:", error);
    },
    [messages, supabase]
  );

  return { messages, loading, sendMessage, editMessage, deleteMessage, pinMessage, addReaction, refresh: fetchMessages };
}
