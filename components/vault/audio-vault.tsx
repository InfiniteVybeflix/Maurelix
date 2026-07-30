"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Trash2, Save, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AudioVaultProps {
  coupleId: string;
  onClose: () => void;
}

export default function AudioVault({ coupleId, onClose }: AudioVaultProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const supabase = createClient();

  const startRecording = async () => {
    try {
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
    } catch {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const saveAudio = async () => {
    if (!audioUrl) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

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
    setSaving(false);
    setAudioUrl(null);
    onClose();
  };

  const discard = () => {
    setAudioUrl(null);
    setSelfDestruct(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-20 left-4 right-4 max-w-sm mx-auto rounded-2xl overflow-hidden glass shadow-2xl border border-white/10 z-50"
    >
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#a78bfa]/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Audio Vault</p>
            <p className="text-[10px] text-white/30">Record a voice note</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-6 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!recording && !audioUrl && (
            <motion.button
              key="record"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center shadow-lg shadow-[#FF6B8A]/30 hover:shadow-[#FF6B8A]/50 transition-shadow"
            >
              <Mic className="w-8 h-8 text-white" />
            </motion.button>
          )}

          {recording && (
            <motion.div
              key="recording"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
                >
                  <Square className="w-7 h-7 text-white" />
                </button>
              </div>
              <p className="mt-4 text-sm text-red-400 animate-pulse">Recording...</p>
            </motion.div>
          )}

          {audioUrl && (
            <motion.div
              key="preview"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full space-y-4"
            >
              <audio src={audioUrl} controls className="w-full rounded-xl" />

              <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:border-[#FF6B8A]/20 transition-colors">
                <input
                  type="checkbox"
                  checked={selfDestruct}
                  onChange={(e) => setSelfDestruct(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#FF6B8A]"
                />
                <Flame className="w-4 h-4 text-[#FF6B8A]" />
                <span className="text-sm text-white/60">Listen Once & Self-Destruct</span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={saveAudio}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white font-medium text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save
                    </>
                  )}
                </button>
                <button
                  onClick={discard}
                  className="px-5 py-3 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors text-sm"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
