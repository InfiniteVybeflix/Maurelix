"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, X } from "lucide-react";
import { useWebRTC } from "@/hooks/use-webrtc";

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
  const { startCall, endCall, connectionState } = useWebRTC(coupleId, partnerId);
  const connectedRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timeout: NodeJS.Timeout;

    navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
        startCall(s, (remote) => {
          setRemoteStream(remote);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
          setIsConnected(true);
          connectedRef.current = true;
          setIsCalling(false);
        });
      })
      .catch(() => {
        setShowFallback(true);
      });

    timeout = setTimeout(() => {
      if (!connectedRef.current) setShowFallback(true);
    }, 15000);

    return () => {
      clearTimeout(timeout);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      endCall();
    };
  }, [callType, startCall, endCall]);

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
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      screenStream.getVideoTracks()[0].onended = () => {
        if (localStream && localVideoRef.current) localVideoRef.current.srcObject = localStream;
      };
    } catch {
      // User cancelled
    }
  };

  if (showFallback) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-7 h-7 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Direct connection unavailable</h3>
          <p className="text-sm text-white/40 mb-6">Send a voice or video message instead?</p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-white font-medium text-sm btn-glow"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Remote video / avatar */}
      <div className="flex-1 relative flex items-center justify-center">
        {remoteStream && callType === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6B8A]/20 to-[#a78bfa]/20 border border-white/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-4xl">💕</span>
            </div>
            <p className="text-white font-medium">{isCalling ? "Calling..." : isConnected ? "Connected" : "Connecting..."}</p>
          </div>
        )}

        {/* Local video pip */}
        {callType === "video" && localStream && (
          <div className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl overflow-hidden border border-white/10 bg-black/50">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-6 flex items-center justify-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {callType === "video" && (
          <>
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOff ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]"
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
            <button
              onClick={handleScreenShare}
              className="w-14 h-14 rounded-full bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12] flex items-center justify-center transition-all"
            >
              <Monitor className="w-5 h-5" />
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
