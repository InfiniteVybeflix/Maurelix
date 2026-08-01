"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ChevronRight, ChevronLeft, Heart, Sparkles, Lock, ShieldCheck, Fingerprint } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateKeyPair, exportPrivateKeyEncrypted, generateDeviceFingerprint, generateSalt, u8ToHex, hashAnswer, exportPrivateKeyWithPassword } from "@/lib/crypto";
import { createPairingCode, verifyPairingCode, completePairing } from "@/lib/pairing";
import { useBiometric } from "@/hooks/use-biometric";
import Starfield from "@/components/onboarding/starfield";

const STEPS = 8;
const COLORS = ["#FF6B8A", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399", "#f472b6"];
const LOVE_LANGUAGES = [
  { key: "words", label: "Words of Affirmation", emoji: "💬" },
  { key: "acts", label: "Acts of Service", emoji: "🤝" },
  { key: "gifts", label: "Receiving Gifts", emoji: "🎁" },
  { key: "time", label: "Quality Time", emoji: "⏳" },
  { key: "touch", label: "Physical Touch", emoji: "🤗" },
];

const SECURITY_QUESTIONS = [
  "What city were you born in?",
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What is your favorite childhood book?",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isSupported: bioSupported, register: registerBio } = useBiometric();

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

  // Security questions state
  const [sq1, setSq1] = useState("");
  const [sq2, setSq2] = useState("");
  const [ans1, setAns1] = useState("");
  const [ans2, setAns2] = useState("");
  const [sqError, setSqError] = useState("");

  // Biometric state
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioError, setBioError] = useState("");

  const userRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userRef.current = user;
        supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });
  }, [supabase]);

  // Pairing expiry cleanup
  useEffect(() => {
    if (!pairingExpiry) return;
    const interval = setInterval(() => {
      if (new Date() > pairingExpiry) setPairingCode("");
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiry]);

  // Debounced profile sync to DB
  const syncToDb = useCallback((updates: Record<string, any>) => {
    const user = userRef.current;
    if (!user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }, 600);
  }, [supabase]);

  // Immediate local state update + debounced DB sync
  const updateProfile = useCallback((updates: Record<string, any>) => {
    setProfile((p: any) => ({ ...p, ...updates }));
    syncToDb(updates);
  }, [syncToDb]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    const user = userRef.current;
    if (!user) return;
    const path = `avatars/${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const updates = { avatar_url: data.publicUrl };
      setProfile((p: any) => ({ ...p, ...updates }));
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  }, [supabase]);

  const handleGenerateCode = async () => {
    setLoading(true);
    const result = await createPairingCode();
    setLoading(false);
    if (result) {
      setPairingCode(result.code);
      setPairingExpiry(result.expiresAt);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setPairingError("");
    const result = await verifyPairingCode(enteredCode.trim());
    setLoading(false);
    if (result.success) {
      await generateAndStoreKeys();
      await completePairing();
      router.push("/app/chat");
    } else {
      setPairingError(result.error || "Invalid code. Please try again.");
    }
  };

  const generateAndStoreKeys = async () => {
    const user = userRef.current;
    if (!user) return;
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
    if (pin.length < 4) { setPinError("PIN must be at least 4 digits"); return; }
    if (pin !== pinConfirm) { setPinError("PINs do not match"); return; }
    sessionStorage.setItem("maurelix_pin", pin);
    setPinError("");
    nextStep();
  };

  const handleSecurityQuestions = async () => {
    if (!sq1 || !sq2 || sq1 === sq2) { setSqError("Please select two different questions"); return; }
    if (!ans1.trim() || !ans2.trim()) { setSqError("Please answer both questions"); return; }
    setSqError("");
    setLoading(true);
    const user = userRef.current;
    if (!user) { setLoading(false); return; }

    const ans1Hash = await hashAnswer(ans1);
    const ans2Hash = await hashAnswer(ans2);
    const recoverySalt = generateSalt();
    const recoveryPassword = `${ans1.toLowerCase().trim()}|${ans2.toLowerCase().trim()}`;

    // Generate keys now so we can create recovery copy
    const { privateKey } = await generateKeyPair();
    const recoveryEncrypted = await exportPrivateKeyWithPassword(privateKey, recoveryPassword, recoverySalt);

    await supabase.from("profiles").update({
      security_question_1: sq1,
      security_answer_1_hash: ans1Hash,
      security_question_2: sq2,
      security_answer_2_hash: ans2Hash,
      recovery_encrypted_private_key: recoveryEncrypted,
      recovery_salt: u8ToHex(recoverySalt),
    }).eq("id", user.id);

    setLoading(false);
    nextStep();
  };

  const handleBiometricSetup = async () => {
    if (!bioEnabled) { nextStep(); return; }
    setLoading(true);
    setBioError("");
    const user = userRef.current;
    if (!user) { setLoading(false); return; }

    const result = await registerBio(user.id, profile.display_name || user.email || "Maurelix User");
    if (result.success && result.credentialId) {
      await supabase.from("profiles").update({
        biometric_enabled: true,
        biometric_credential_id: result.credentialId,
      }).eq("id", user.id);
      setLoading(false);
      nextStep();
    } else {
      setBioError(result.error || "Could not enable fingerprint");
      setLoading(false);
    }
  };

  const nextStep = () => { if (step < STEPS - 1) setStep((s) => s + 1); };
  const prevStep = () => { if (step > 0) setStep((s) => s - 1); };

  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return !!(profile.display_name?.trim());
      case 4: return pin.length >= 4 && pin === pinConfirm;
      case 5: return !!(sq1 && sq2 && sq1 !== sq2 && ans1.trim() && ans2.trim());
      default: return true;
    }
  }, [step, profile.display_name, pin, pinConfirm, sq1, sq2, ans1, ans2]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Who are you?</h2>
            <div className="flex justify-center">
              <div onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-white/[0.03] border-2 border-white/10 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#FF6B8A]/40 transition-all group">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-white/30 group-hover:text-[#FF6B8A] transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </div>
            <input type="text" placeholder="Your name" value={profile.display_name || ""}
              onChange={(e) => updateProfile({ display_name: e.target.value })}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all" />
          </div>
        );

      case 1:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Pick your vibe</h2>
            <div className="flex justify-center gap-3 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => updateProfile({ theme_color: c })}
                  className={`w-12 h-12 rounded-xl transition-all ${profile.theme_color === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <input type="color" value={profile.theme_color || "#FF6B8A"}
              onChange={(e) => updateProfile({ theme_color: e.target.value })}
              className="w-full max-w-xs mx-auto h-12 rounded-xl cursor-pointer" />
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Name your co-mind</h2>
            <p className="text-white/50 text-sm">What should Syne call itself?</p>
            <input type="text" placeholder="Syne" value={profile.ai_name || ""}
              onChange={(e) => updateProfile({ ai_name: e.target.value })}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg font-semibold focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all" />
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Your love language</h2>
            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
              {LOVE_LANGUAGES.map((ll) => (
                <button key={ll.key} onClick={() => updateProfile({ love_language: ll.key })}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                    profile.love_language === ll.key ? "border-[#FF6B8A]/40 bg-[#FF6B8A]/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}>
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
            <p className="text-white/50 text-sm max-w-xs mx-auto">This PIN protects your private messages. Never share it. We cannot recover it without your security answers.</p>
            <input type="password" inputMode="numeric" pattern="[0-9]*" placeholder="Enter 4+ digit PIN"
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all" />
            <input type="password" inputMode="numeric" pattern="[0-9]*" placeholder="Confirm PIN"
              value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all" />
            {pinError && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{pinError}</p>}
            <button onClick={handlePinSet}
              className="w-full max-w-xs mx-auto py-3 rounded-2xl text-white font-semibold text-sm btn-glow"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
              Secure My Vault
            </button>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#FF6B8A]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Security Questions</h2>
            <p className="text-white/50 text-sm max-w-xs mx-auto">These help you recover your PIN if you ever forget it.</p>
            <div className="max-w-xs mx-auto space-y-3 text-left">
              <select value={sq1} onChange={(e) => setSq1(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/40">
                <option value="" className="bg-[#0a0a1a]">Select question 1</option>
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q} className="bg-[#0a0a1a]" disabled={q === sq2}>{q}</option>
                ))}
              </select>
              <input type="text" placeholder="Your answer" value={ans1} onChange={(e) => setAns1(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/40" />
              <select value={sq2} onChange={(e) => setSq2(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/40">
                <option value="" className="bg-[#0a0a1a]">Select question 2</option>
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q} className="bg-[#0a0a1a]" disabled={q === sq1}>{q}</option>
                ))}
              </select>
              <input type="text" placeholder="Your answer" value={ans2} onChange={(e) => setAns2(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/40" />
            </div>
            {sqError && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl max-w-xs mx-auto">{sqError}</p>}
            <button onClick={handleSecurityQuestions} disabled={loading}
              className="w-full max-w-xs mx-auto py-3 rounded-2xl text-white font-semibold text-sm btn-glow disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        );

      case 6:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-[#FF6B8A]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Fingerprint Unlock</h2>
            <p className="text-white/50 text-sm max-w-xs mx-auto">
              {bioSupported
                ? "Unlock your vault with your fingerprint for faster access."
                : "Your device doesn't support biometric authentication."}
            </p>
            {bioSupported && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setBioEnabled(false)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${!bioEnabled ? "bg-[#FF6B8A]/20 text-[#FF6B8A] border border-[#FF6B8A]/30" : "bg-white/[0.03] text-white/50 border border-white/10"}`}>
                  Skip
                </button>
                <button onClick={() => setBioEnabled(true)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${bioEnabled ? "bg-[#FF6B8A]/20 text-[#FF6B8A] border border-[#FF6B8A]/30" : "bg-white/[0.03] text-white/50 border border-white/10"}`}>
                  Enable
                </button>
              </div>
            )}
            {bioError && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl max-w-xs mx-auto">{bioError}</p>}
            <button onClick={handleBiometricSetup} disabled={loading || !bioSupported}
              className="w-full max-w-xs mx-auto py-3 rounded-2xl text-white font-semibold text-sm btn-glow disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
              {loading ? "Setting up..." : bioEnabled ? "Register Fingerprint" : "Continue"}
            </button>
          </div>
        );

      case 7:
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">Connect with your partner</h2>
            {!pairingCode ? (
              <div className="space-y-4">
                <button onClick={handleGenerateCode} disabled={loading}
                  className="w-full max-w-xs mx-auto py-4 rounded-2xl text-white font-semibold text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Pairing Code</>}
                </button>
                <p className="text-white/30 text-sm">or enter their code</p>
                <div className="flex gap-3 max-w-xs mx-auto">
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all" />
                  <button onClick={handleVerifyCode} disabled={loading || enteredCode.length !== 6}
                    className="px-5 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                {pairingError && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl max-w-xs mx-auto">{pairingError}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-block px-8 py-4 rounded-2xl bg-white/[0.03] border border-[#FF6B8A]/20">
                  <p className="text-3xl font-mono font-bold text-[#FF6B8A] tracking-[0.2em]">{pairingCode}</p>
                </div>
                <p className="text-white/40 text-sm">Expires in {pairingExpiry ? Math.max(0, Math.ceil((pairingExpiry.getTime() - Date.now()) / 1000 / 60)) : 0} minutes</p>
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
      style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #1a1a3e 100%)" }}>
      <Starfield />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex justify-center gap-2 mb-10">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-8 bg-[#FF6B8A]" : "w-4 bg-white/10"}`} />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-between mt-10">
          <button onClick={prevStep} disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white/40 hover:text-white disabled:opacity-0 transition-all">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS - 1 && step !== 4 && step !== 5 && step !== 6 && (
            <button onClick={nextStep} disabled={!stepValid}
              className="flex items-center gap-1 px-4 py-2 text-sm text-[#FF6B8A] hover:text-[#ff8fa3] transition-colors disabled:opacity-30">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
