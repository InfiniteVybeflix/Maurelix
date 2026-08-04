"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronRight,
  ChevronLeft,
  Heart,
  Sparkles,
  Lock,
  ShieldCheck,
  Fingerprint,
  AlertCircle,
  Smartphone,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  generateKeyPair,
  exportPrivateKeyEncrypted,
  generateDeviceFingerprint,
  generateSalt,
  u8ToHex,
  hashAnswer,
  exportPrivateKeyWithPassword,
} from "@/lib/crypto";
import { createPairingCode, verifyPairingCode, completePairing } from "@/lib/pairing";
import { useBiometric } from "@/hooks/use-biometric";
import Starfield from "@/components/onboarding/starfield";

const STEPS = 8;
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
  const { isSupported: bioSupported, checked: bioChecked, register: registerBio } =
    useBiometric();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [pairingCode, setPairingCode] = useState("");
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [pairingCodeError, setPairingCodeError] = useState("");

  const [enteredCode, setEnteredCode] = useState("");
  const [pairingError, setPairingError] = useState("");

  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");

  const [sq1, setSq1] = useState("");
  const [sq2, setSq2] = useState("");
  const [ans1, setAns1] = useState("");
  const [ans2, setAns2] = useState("");
  const [sqError, setSqError] = useState("");

  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAttachment, setBioAttachment] = useState<"platform" | "cross-platform">("platform");
  const [bioError, setBioError] = useState("");
  const [bioWarning, setBioWarning] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const userRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userRef.current = user;
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
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

  const syncToDb = useCallback(
    (updates: Record<string, any>) => {
      const user = userRef.current;
      if (!user) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: user.id, ...updates }, { onConflict: "id" });
        if (error) {
          console.error("[syncToDb] Profile upsert failed:", error.message);
          setGlobalError("Failed to save your info. Please refresh and try again.");
        }
      }, 600);
    },
    [supabase]
  );

  const updateProfile = useCallback(
    (updates: Record<string, any>) => {
      setProfile((p: any) => ({ ...p, ...updates }));
      syncToDb(updates);
    },
    [syncToDb]
  );

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      const user = userRef.current;
      if (!user) return;

      // Validate file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setAvatarError("Image is too large. Maximum size is 5MB.");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setAvatarError("Please select a valid image file.");
        return;
      }

      setAvatarUploading(true);
      setAvatarError("");

      const path = `avatars/${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("[Avatar Upload] Storage error:", uploadError);
        setAvatarError(
          uploadError.message.toLowerCase().includes("bucket")
            ? "Storage bucket not found. Ask your admin to create the 'avatars' bucket in Supabase."
            : "Failed to upload image. Please try again."
        );
        setAvatarUploading(false);
        // Reset input so the same file can be retried
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const updates = { id: user.id, avatar_url: data.publicUrl };
      setProfile((p: any) => ({ ...p, ...updates }));

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(updates, { onConflict: "id" });

      if (profileError) {
        console.error("[Avatar Upload] Profile upsert error:", profileError);
        setAvatarError("Image uploaded, but failed to save to your profile.");
      }

      setAvatarUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [supabase]
  );

  const handleGenerateCode = async () => {
    setLoading(true);
    setPairingCodeError("");
    setGlobalError("");

    const result = await createPairingCode();
    setLoading(false);

    if (result.success) {
      setPairingCode(result.data.code);
      setPairingExpiry(result.data.expiresAt);
    } else {
      setPairingCodeError(result.error.error);
      if (result.error.details) {
        console.error("[Pairing Code] Details:", result.error.details);
      }
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

    // CRITICAL FIX: Replace .or() with two separate queries to avoid PostgREST issues.
    let coupleId: string | null = null;

    const { data: asA } = await supabase
      .from("couples")
      .select("id")
      .eq("user_a_id", user.id)
      .maybeSingle();
    if (asA) coupleId = asA.id;

    if (!coupleId) {
      const { data: asB } = await supabase
        .from("couples")
        .select("id")
        .eq("user_b_id", user.id)
        .maybeSingle();
      if (asB) coupleId = asB.id;
    }

    if (coupleId) {
      await supabase
        .from("couples")
        .update({ encryption_pub_key: JSON.stringify(publicKey) })
        .eq("id", coupleId);
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

  const handleSecurityQuestions = async () => {
    if (!sq1 || !sq2 || sq1 === sq2) {
      setSqError("Please select two different questions");
      return;
    }
    if (!ans1.trim() || !ans2.trim()) {
      setSqError("Please answer both questions");
      return;
    }
    setSqError("");
    setLoading(true);
    const user = userRef.current;
    if (!user) {
      setLoading(false);
      return;
    }

    const ans1Hash = await hashAnswer(ans1);
    const ans2Hash = await hashAnswer(ans2);
    const recoverySalt = generateSalt();
    const recoveryPassword = `${ans1.toLowerCase().trim()}|${ans2.toLowerCase().trim()}`;

    const { privateKey } = await generateKeyPair();
    const recoveryEncrypted = await exportPrivateKeyWithPassword(
      privateKey,
      recoveryPassword,
      recoverySalt
    );

    await supabase
      .from("profiles")
      .update({
        security_question_1: sq1,
        security_answer_1_hash: ans1Hash,
        security_question_2: sq2,
        security_answer_2_hash: ans2Hash,
        recovery_encrypted_private_key: recoveryEncrypted,
        recovery_salt: u8ToHex(recoverySalt),
      })
      .eq("id", user.id);

    setLoading(false);
    nextStep();
  };

  const handleBiometricSetup = async () => {
    if (!bioEnabled) {
      nextStep();
      return;
    }
    setLoading(true);
    setBioError("");
    setBioWarning("");
    const user = userRef.current;
    if (!user) {
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setBioWarning(
        "Biometric setup requires HTTPS. You can skip this step and enable it later from Settings."
      );
      setLoading(false);
      return;
    }

    const result = await registerBio(
      user.id,
      profile.display_name || user.email || "Maurelix User",
      { attachment: bioAttachment }
    );

    if (result.success && result.credentialId) {
      await supabase
        .from("profiles")
        .update({
          biometric_enabled: true,
          biometric_credential_id: result.credentialId,
        })
        .eq("id", user.id);
      setLoading(false);
      nextStep();
    } else {
      setBioError(
        result.error || "Could not enable biometric login. You can skip this and set it up later in Settings."
      );
      setLoading(false);
    }
  };

  const nextStep = () => {
    setGlobalError("");
    if (step < STEPS - 1) setStep((s) => s + 1);
  };
  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return !!(profile.display_name?.trim());
      case 1:
        return true;
      case 2:
        return !!(profile.love_language);
      case 3:
        return !!(profile.ai_name?.trim());
      case 4:
        return pin.length >= 4 && pin === pinConfirm;
      case 5:
        return sq1 && sq2 && sq1 !== sq2 && ans1.trim() && ans2.trim();
      case 6:
        return true;
      case 7:
        return !!pairingCode || !!profile.partner_id;
      default:
        return true;
    }
  }, [step, profile, pin, pinConfirm, sq1, sq2, ans1, ans2, pairingCode]);

  const progress = ((step + 1) / STEPS) * 100;

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #1a1a3e 100%)" }}>
      <Starfield />

      <div className="fixed top-0 left-0 right-0 h-1 bg-white/[0.05] z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FF6B8A] to-[#e94560]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-7 h-7 text-[#FF6B8A]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What should we call you?</h2>
              <p className="text-white/40 text-sm mb-8">This is how your partner will see you.</p>
              <input
                type="text"
                value={profile.display_name || ""}
                onChange={(e) => updateProfile({ display_name: e.target.value })}
                placeholder="Your name"
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
                maxLength={30}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Add a photo</h2>
              <p className="text-white/40 text-sm mb-8">Let your partner see your face.</p>
              <div
                className={`relative w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-2 border-dashed transition-colors cursor-pointer group ${
                  avatarUploading
                    ? "border-[#FF6B8A]/40"
                    : "border-white/20 hover:border-[#FF6B8A]/40"
                }`}
                onClick={() => {
                  if (!avatarUploading) fileInputRef.current?.click();
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className={`w-8 h-8 transition-colors ${
                      avatarUploading ? "text-[#FF6B8A]/60" : "text-white/30 group-hover:text-[#FF6B8A]/60"
                    }`} />
                  </div>
                )}
                {/* Uploading spinner overlay */}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {/* Hover overlay — hidden during upload */}
                {!avatarUploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
              {avatarError && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-xl mb-3 max-w-xs mx-auto"
                >
                  {avatarError}
                </motion.p>
              )}
              <p className="text-xs text-white/20">Optional — you can add one later</p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white text-center mb-2">Your Love Language</h2>
              <p className="text-white/40 text-sm text-center mb-8">How do you feel most loved?</p>
              <div className="space-y-3">
                {LOVE_LANGUAGES.map((ll) => (
                  <button
                    key={ll.key}
                    onClick={() => updateProfile({ love_language: ll.key })}
                    className={`w-full px-5 py-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
                      profile.love_language === ll.key
                        ? "bg-[#FF6B8A]/10 border-[#FF6B8A]/30"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl">{ll.emoji}</span>
                    <span className="text-white font-medium">{ll.label}</span>
                    {profile.love_language === ll.key && (
                      <Heart className="w-5 h-5 text-[#FF6B8A] ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-7 h-7 text-[#a78bfa]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Name your co-mind</h2>
              <p className="text-white/40 text-sm mb-8">What would you like to call Syne?</p>
              <input
                type="text"
                value={profile.ai_name || ""}
                onChange={(e) => updateProfile({ ai_name: e.target.value })}
                placeholder="Syne"
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/40 focus:ring-1 focus:ring-[#a78bfa]/20 transition-all"
                maxLength={20}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-7 h-7 text-[#fbbf24]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create a PIN</h2>
              <p className="text-white/40 text-sm mb-8">This encrypts your messages. Never share it.</p>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPin(val);
                  setPinError("");
                }}
                placeholder="Enter PIN (min 4 digits)"
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg placeholder:text-white/20 focus:outline-none focus:border-[#fbbf24]/40 focus:ring-1 focus:ring-[#fbbf24]/20 transition-all mb-4"
                maxLength={12}
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pinConfirm}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPinConfirm(val);
                  setPinError("");
                }}
                placeholder="Confirm PIN"
                className="w-full px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg placeholder:text-white/20 focus:outline-none focus:border-[#fbbf24]/40 focus:ring-1 focus:ring-[#fbbf24]/20 transition-all"
                maxLength={12}
              />
              {pinError && (
                <p className="mt-3 text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{pinError}</p>
              )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="w-16 h-16 rounded-full bg-[#34d399]/10 border border-[#34d399]/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-7 h-7 text-[#34d399]" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Recovery Questions</h2>
              <p className="text-white/40 text-sm text-center mb-8">In case you forget your PIN.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Question 1</label>
                  <select
                    value={sq1}
                    onChange={(e) => { setSq1(e.target.value); setSqError(""); }}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#34d399]/40"
                  >
                    <option value="" className="bg-[#0a0a1a]">Select a question...</option>
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-[#0a0a1a]">{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={ans1}
                    onChange={(e) => { setAns1(e.target.value); setSqError(""); }}
                    placeholder="Your answer"
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#34d399]/40"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Question 2</label>
                  <select
                    value={sq2}
                    onChange={(e) => { setSq2(e.target.value); setSqError(""); }}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#34d399]/40"
                  >
                    <option value="" className="bg-[#0a0a1a]">Select a question...</option>
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-[#0a0a1a]">{q}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={ans2}
                    onChange={(e) => { setAns2(e.target.value); setSqError(""); }}
                    placeholder="Your answer"
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#34d399]/40"
                  />
                </div>
              </div>

              {sqError && (
                <p className="mt-3 text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{sqError}</p>
              )}
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="w-16 h-16 rounded-full bg-[#60a5fa]/10 border border-[#60a5fa]/20 flex items-center justify-center mx-auto mb-6">
                <Fingerprint className="w-7 h-7 text-[#60a5fa]" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Biometric Login</h2>
              <p className="text-white/40 text-sm text-center mb-8">Unlock Maurelix with your fingerprint or face.</p>

              {!bioChecked ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-[#60a5fa]/30 border-t-[#60a5fa] rounded-full animate-spin" />
                </div>
              ) : !bioSupported ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
                  <AlertCircle className="w-6 h-6 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/40">
                    Biometric authentication is not available on this device or browser.
                  </p>
                  <p className="text-xs text-white/20 mt-1">
                    {typeof window !== "undefined" && !window.isSecureContext
                      ? "HTTPS is required for biometric auth."
                      : "Your browser or device does not support WebAuthn."}
                  </p>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer hover:border-[#60a5fa]/20 transition-colors mb-4">
                    <input
                      type="checkbox"
                      checked={bioEnabled}
                      onChange={(e) => {
                        setBioEnabled(e.target.checked);
                        setBioError("");
                        setBioWarning("");
                      }}
                      className="w-5 h-5 rounded accent-[#60a5fa]"
                    />
                    <span className="text-white font-medium">Enable biometric login</span>
                  </label>

                  <AnimatePresence>
                    {bioEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <p className="text-xs text-white/30 px-1">Choose your authenticator:</p>

                        <label
                          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all cursor-pointer ${
                            bioAttachment === "platform"
                              ? "bg-[#60a5fa]/10 border-[#60a5fa]/30"
                              : "bg-white/[0.02] border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name="bio-attachment"
                            value="platform"
                            checked={bioAttachment === "platform"}
                            onChange={() => setBioAttachment("platform")}
                            className="w-4 h-4 accent-[#60a5fa]"
                          />
                          <Smartphone className="w-5 h-5 text-[#60a5fa] shrink-0" />
                          <div>
                            <span className="text-white font-medium text-sm">Device fingerprint / face unlock</span>
                            <p className="text-xs text-white/30">Use your phone&apos;s lock screen biometric</p>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all cursor-pointer ${
                            bioAttachment === "cross-platform"
                              ? "bg-[#60a5fa]/10 border-[#60a5fa]/30"
                              : "bg-white/[0.02] border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name="bio-attachment"
                            value="cross-platform"
                            checked={bioAttachment === "cross-platform"}
                            onChange={() => setBioAttachment("cross-platform")}
                            className="w-4 h-4 accent-[#60a5fa]"
                          />
                          <KeyRound className="w-5 h-5 text-[#60a5fa] shrink-0" />
                          <div>
                            <span className="text-white font-medium text-sm">Security key or external device</span>
                            <p className="text-xs text-white/30">YubiKey, phone via QR, or other FIDO2 key</p>
                          </div>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {bioWarning && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-sm text-amber-400 bg-amber-400/10 px-4 py-3 rounded-xl"
                    >
                      {bioWarning}
                    </motion.p>
                  )}

                  {bioError && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl"
                    >
                      {bioError}
                    </motion.p>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="w-16 h-16 rounded-full bg-[#FF6B8A]/10 border border-[#FF6B8A]/20 flex items-center justify-center mx-auto mb-6">
                <Heart className="w-7 h-7 text-[#FF6B8A]" />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-2">Connect with your partner</h2>
              <p className="text-white/40 text-sm text-center mb-8">Generate a code and share it with them.</p>

              {pairingCode ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.03] border border-[#FF6B8A]/20 mb-4">
                    <span className="text-3xl font-bold tracking-[0.3em] text-white">{pairingCode}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(pairingCode)}
                      className="p-2 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors"
                      title="Copy code"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-white/40 mb-6">
                    Expires in {Math.max(0, Math.ceil(((pairingExpiry?.getTime() || 0) - Date.now()) / 60000))} minutes
                  </p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
                  >
                    {loading ? "Generating..." : "Generate new code"}
                  </button>
                </motion.div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={handleGenerateCode}
                    disabled={loading}
                    className="px-8 py-4 rounded-2xl text-white font-semibold text-sm btn-glow inline-flex items-center gap-2 disabled:opacity-50"
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

                  {pairingCodeError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-400">{pairingCodeError}</p>
                          <p className="text-xs text-red-400/60 mt-1">
                            Open your browser&apos;s DevTools (F12 → Console) and screenshot the logs for the developer.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <p className="text-sm text-white/30 text-center mb-4">Or enter your partner&apos;s code</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={enteredCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setEnteredCode(val);
                      setPairingError("");
                    }}
                    placeholder="6-digit code"
                    className="flex-1 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-center text-lg tracking-[0.2em] placeholder:text-white/20 placeholder:tracking-normal focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || enteredCode.length !== 6}
                    className="px-6 py-3 rounded-2xl text-white font-medium text-sm btn-glow disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Connect"}
                  </button>
                </div>
                {pairingError && (
                  <p className="mt-3 text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl text-center">{pairingError}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {globalError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-sm text-red-400 max-w-md text-center"
          >
            {globalError}
          </motion.div>
        )}

        <div className="flex items-center gap-4 mt-10">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="p-3 rounded-2xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {step < STEPS - 1 ? (
            <button
              onClick={() => {
                if (step === 4) handlePinSet();
                else if (step === 5) handleSecurityQuestions();
                else if (step === 6) handleBiometricSetup();
                else nextStep();
              }}
              disabled={!stepValid || loading}
              className="px-8 py-3 rounded-2xl text-white font-semibold text-sm btn-glow disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => router.push("/app/chat")}
              className="px-8 py-3 rounded-2xl text-white font-semibold text-sm btn-glow flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
            >
              Enter Maurelix
              <Heart className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-white/20">
          Step {step + 1} of {STEPS}
        </p>
      </div>
    </div>
  );
}
