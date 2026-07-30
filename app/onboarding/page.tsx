"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronRight, ChevronLeft, Heart, Sparkles, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateKeyPair, exportPrivateKeyEncrypted, generateDeviceFingerprint, generateSalt, u8ToHex } from "@/lib/crypto";
import { generatePairingCode, verifyPairingCode, completePairing } from "@/lib/pairing";

const STEPS = 6;
const COLORS = ["#FF6B8A", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399", "#f472b6"];
const LOVE_LANGUAGES = [
  { key: "words", label: "Words of Affirmation", emoji: "💬" },
  { key: "acts", label: "Acts of Service", emoji: "🤝" },
  { key: "gifts", label: "Receiving Gifts", emoji: "🎁" },
  { key: "time", label: "Quality Time", emoji: "⏰" },
  { key: "touch", label: "Physical Touch", emoji: "🤗" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [pairingError, setPairingError] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!pairingExpiry) return;
    const interval = setInterval(() => {
      if (new Date() > pairingExpiry) setPairingCode("");
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiry]);

  const updateProfile = async (updates: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("id", user.id);
    setProfile((p: any) => ({ ...p, ...updates }));
  };

  const handleAvatarUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `avatars/${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl });
    }
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    const result = await generatePairingCode();
    setLoading(false);
    if (result) {
      setPairingCode(result.code);
      setPairingExpiry(result.expiresAt);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setPairingError("");
    const result = await verifyPairingCode(enteredCode);
    setLoading(false);
    if (result.success) {
      await generateAndStoreKeys();
      await completePairing();
      router.push("/app/chat");
    } else {
      setPairingError(result.error || "Failed");
    }
  };

  const generateAndStoreKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use the PIN from sessionStorage
    const userPin = sessionStorage.getItem("maurelix_pin");
    if (!userPin) {
      setPinError("PIN not set. Please go back and set your PIN.");
      return;
    }

    const { publicKey, privateKey } = await generateKeyPair();
    const salt = generateSalt();
    const encryptedPrivate = await exportPrivateKeyEncrypted(privateKey, userPin, salt);
    const fingerprint = generateDeviceFingerprint();

    await supabase.from("device_keys").insert({
      user_id: user.id,
      device_fingerprint: fingerprint,
      public_key: JSON.stringify(publicKey),
      encrypted_private_key: encryptedPrivate,
      encryption_salt: u8ToHex(salt),
    });

    const { data: couple } = await supabase
      .from("couples")
      .select("id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .single();

    if (couple) {
      await supabase.from("couples").update({ encryption_pub_key: JSON.stringify(publicKey) }).eq("id", couple.id);
    }
  };

  const handlePinSet = () => {
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("PINs do not match");
      return;
    }
    sessionStorage.setItem("maurelix_pin", pin);
    setPinError("");
    nextStep();
  };

  const nextStep = () => { if (step < STEPS - 1) setStep(step + 1); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Who are you?</h2>
            <div className="flex justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-white/[0.03] border-2 border-white/10 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#FF6B8A]/40 transition-all group"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-white/30 group-hover:text-[#FF6B8A] transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={profile.display_name || ""}
              onChange={(e) => updateProfile({ display_name: e.target.value })}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
          </div>
        );

      case 1:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Pick your vibe</h2>
            <div className="flex justify-center gap-3 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateProfile({ theme_color: c })}
                  className={`w-12 h-12 rounded-xl transition-all ${profile.theme_color === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <input
              type="color"
              value={profile.theme_color || "#FF6B8A"}
              onChange={(e) => updateProfile({ theme_color: e.target.value })}
              className="w-full max-w-xs mx-auto h-12 rounded-xl cursor-pointer"
            />
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Name your co-mind</h2>
            <p className="text-white/50 text-sm">What should Syne call itself?</p>
            <input
              type="text"
              placeholder="Syne"
              value={profile.ai_name || ""}
              onChange={(e) => updateProfile({ ai_name: e.target.value })}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg font-semibold focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Your love language</h2>
            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
              {LOVE_LANGUAGES.map((ll) => (
                <button
                  key={ll.key}
                  onClick={() => updateProfile({ love_language: ll.key })}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                    profile.love_language === ll.key
                      ? "border-[#FF6B8A]/40 bg-[#FF6B8A]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <span className="text-xl">{ll.emoji}</span>
                  <span className="text-white text-sm font-medium">{ll.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-[#FF6B8A]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Set your encryption PIN</h2>
            <p className="text-white/50 text-sm max-w-xs mx-auto">
              This PIN protects your private messages. Never share it. We cannot recover it.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 4+ digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Confirm PIN"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
            {pinError && (
              <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{pinError}</p>
            )}
            <button
              onClick={handlePinSet}
              className="w-full max-w-xs mx-auto py-3 rounded-2xl text-white font-semibold text-sm btn-glow"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              Secure My Vault
            </button>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Connect with your partner</h2>
            {!pairingCode ? (
              <div className="space-y-4">
                <button
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="w-full max-w-xs mx-auto py-4 rounded-2xl text-white font-semibold text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Pairing Code
                    </>
                  )}
                </button>
                <p className="text-white/30 text-sm">or enter their code</p>
                <div className="flex gap-3 max-w-xs mx-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
                  />
                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || enteredCode.length !== 6}
                    className="px-5 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                {pairingError && (
                  <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{pairingError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-block px-8 py-4 rounded-2xl bg-white/[0.03] border border-[#FF6B8A]/20">
                  <p className="text-3xl font-mono font-bold text-[#FF6B8A] tracking-[0.2em]">{pairingCode}</p>
                </div>
                <p className="text-white/40 text-sm">
                  Expires in {pairingExpiry ? Math.max(0, Math.ceil((pairingExpiry.getTime() - Date.now()) / 1000 / 60)) : 0} minutes
                </p>
                <p className="text-white/30 text-xs">Share this code with your partner. Wait for them to connect.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #1a1a3e 100%)" }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              background: Math.random() > 0.7 ? "rgba(255,200,220,0.8)" : "rgba(255,255,255,0.6)",
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 5}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-10">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-[#FF6B8A]" : "w-4 bg-white/10"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white/40 hover:text-white disabled:opacity-0 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS - 1 && step !== 4 && (
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-2 text-sm text-[#FF6B8A] hover:text-[#ff8fa3] transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
