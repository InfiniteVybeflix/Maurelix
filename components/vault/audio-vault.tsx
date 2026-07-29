"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mic, Square, Play, Trash2, Clock } from "lucide-react";

interface AudioVaultProps {
  coupleId: string;
}

export default function AudioVault({ coupleId }: AudioVaultProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selfDestruct, setSelfDestruct] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const supabase = createClient();

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveAudio = async () => {
    if (!audioUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const blob = await fetch(audioUrl).then((r) => r.blob());
    const path = `${coupleId}/${user.id}/audio/${Date.now()}.webm`;
    const { error } = await supabase.storage.from("attachments").upload(path, blob, { contentType: "audio/webm" });
    if (!error) {
      const { data: attachment } = await supabase.from("attachments").insert({
        uploader_id: user.id,
        file_type: "audio",
        storage_path: path,
        expires_at: selfDestruct ? new Date(Date.now() + 60 * 1000).toISOString() : null,
      }).select().single();
      if (attachment) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          couple_id: coupleId,
          content_encrypted: "🔒 Voice note",
          content_nonce: "",
          attachment_id: attachment.id,
          vault_id: null,
        });
      }
    }
    setAudioUrl(null);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-bold">Audio Vault</h3>
      <div className="flex items-center justify-center gap-4">
        {!recording && !audioUrl && (
          <button onClick={startRecording} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:opacity-90 transition">
            <Mic className="w-6 h-6" />
          </button>
        )}
        {recording && (
          <button onClick={stopRecording} className="w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition animate-pulse">
            <Square className="w-6 h-6" />
          </button>
        )}
        {audioUrl && (
          <div className="flex items-center gap-2">
            <audio src={audioUrl} controls className="h-8 w-40" />
            <button onClick={saveAudio} className="px-3 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition">Save</button>
            <button onClick={() => setAudioUrl(null)} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><Trash2 className="w-4 h-4 text-red-500" /></button>
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] cursor-pointer">
        <input type="checkbox" checked={selfDestruct} onChange={(e) => setSelfDestruct(e.target.checked)} className="accent-[var(--accent)]" />
        <Clock className="w-3 h-3" /> Listen Once & Self-Destruct
      </label>
    </div>
  );
}
