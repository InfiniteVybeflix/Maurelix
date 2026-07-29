"use client";

import { useState, useEffect, useRef } from "react";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Phone, PhoneOff, Monitor, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface CallModalProps {
  coupleId: string;
  partnerId: string;
  callType: "audio" | "video";
  onClose: () => void;
}

export default function CallModal({ coupleId, partnerId, callType, onClose }: CallModalProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { startCall, endCall, sendSignal, connectionState } = useWebRTC(coupleId, partnerId);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true }).then((s) => {
      stream = s;
      setLocalStream(s);
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      startCall(s, (remote) => {
        setRemoteStream(remote);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
        setIsConnected(true);
        setIsCalling(false);
      });
    }).catch(() => {
      setShowFallback(true);
    });

    const timeout = setTimeout(() => {
      if (!isConnected) setShowFallback(true);
    }, 15000);

    return () => {
      clearTimeout(timeout);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      endCall();
    };
  }, []);

  useEffect(() => {
    if (connectionState === "failed") setShowFallback(true);
  }, [connectionState]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // Replace track in peer connection would go here in full implementation
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
    } catch {}
  };

  if (showFallback) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-sm font-medium mb-2">Direct connection unavailable</p>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Send a voice or video message instead?</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex-1 relative flex items-center justify-center">
        {remoteStream && callType === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-10 h-10 text-[var(--accent)]" />
            </div>
            <p className="text-white font-medium">{isCalling ? "Calling..." : isConnected ? "Connected" : "Connecting..."}</p>
          </div>
        )}
        {callType === "video" && localStream && (
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/20" />
        )}
      </div>
      <div className="p-6 flex items-center justify-center gap-4">
        <button onClick={toggleMute} className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        {callType === "video" && (
          <>
            <button onClick={toggleVideo} className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
            <button onClick={handleScreenShare} className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              <Monitor className="w-6 h-6" />
            </button>
          </>
        )}
        <button onClick={() => { endCall(); onClose(); }} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
