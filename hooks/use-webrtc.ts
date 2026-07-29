"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

export function useWebRTC(coupleId: string, partnerId: string) {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`webrtc:${coupleId}`)
      .on("broadcast", { event: "signal" }, async (payload) => {
        const { signal_type, payload: signalPayload } = payload.payload as { signal_type: string; payload: unknown };
        if (!pcRef.current) return;
        try {
          if (signal_type === "offer") {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            await supabase.channel(`webrtc:${coupleId}`).send({ type: "broadcast", event: "signal", payload: { signal_type: "answer", payload: answer } });
          } else if (signal_type === "answer") {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signalPayload as RTCSessionDescriptionInit));
          } else if (signal_type === "ice-candidate") {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(signalPayload as RTCIceCandidateInit));
          }
        } catch {}
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [coupleId, supabase]);

  const startCall = useCallback(async (localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVERS }] });
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      if (event.streams[0]) onRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.channel(`webrtc:${coupleId}`).send({
          type: "broadcast",
          event: "signal",
          payload: { signal_type: "ice-candidate", payload: event.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await supabase.channel(`webrtc:${coupleId}`).send({
      type: "broadcast",
      event: "signal",
      payload: { signal_type: "offer", payload: offer },
    });
  }, [coupleId, supabase]);

  const endCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const sendSignal = useCallback(async (type: string, payload: unknown) => {
    await supabase.from("webrtc_signals").insert({
      couple_id: coupleId,
      sender_id: (await supabase.auth.getUser()).data.user?.id,
      recipient_id: partnerId,
      signal_type: type as "offer" | "answer" | "ice-candidate",
      payload,
    });
  }, [coupleId, partnerId, supabase]);

  return { startCall, endCall, sendSignal, connectionState };
}
