"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateKeyPair, exportPrivateKeyEncrypted, generateDeviceFingerprint } from "@/lib/crypto";
import { createPairingCode, verifyPairingCode, completePairing } from "@/lib/pairing";
import { Heart, Camera, Palette, Sparkles, HeartHandshake, CalendarDays, Shield, ChevronRight, ChevronLeft, Loader2, Copy, Check } from "lucide-react";

const STEPS = 6;
const COLORS = ["#FF6B8A", "#e94560", "#6B8AFF", "#8AFF6B", "#FFB86B", "#B86BFF"];
const LOVE_LANGUAGES = [
  { key: "words", label: "Words of Affirmation", icon: Sparkles },
  { key: "acts", label: "Acts of Service", icon: HeartHandshake },
  { key: "gifts", label: "Receiving Gifts", icon: Heart },
  { key: "time", label: "Quality Time", icon: CalendarDays },
  { key: "touch", label: "Physical Touch", icon: Shield },
] as const;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [pairingError, setPairingError] = useState("");
  const [copied, setCopied] = useState(false);
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

  const updateProfile = async (updates: Record<string, unknown>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("id", user.id);
    setProfile((p) => ({ ...p, ...updates }));
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
    const { publicKey, privateKey } = await generateKeyPair();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const session = await supabase.auth.getSession();
    const password = session.data.session?.access_token || user.id;
    const encryptedPrivate = await exportPrivateKeyEncrypted(privateKey, password, salt);
    const fingerprint = generateDeviceFingerprint();
    await supabase.from("device_keys").insert({
      user_id: user.id,
      device_fingerprint: fingerprint,
      public_key: JSON.stringify(publicKey),
      encrypted_private_key: encryptedPrivate,
    });
    const { data: couple } = await supabase.from("couples").select("id").or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`).single();
    if (couple) {
      await supabase.from("couples").update({ encryption_pub_key: JSON.stringify(publicKey) }).eq("id", couple.id);
    }
  };

  const nextStep = () => {
    if (step < STEPS - 1) setStep(step + 1);
  };
  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Who are you?</h2>
            <div className="flex flex-col items-center gap-4">
              <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center cursor-pointer overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)] transition">
                {profile.avatar_url ? <img src={profile.avatar_url as string} alt="avatar" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-[var(--muted-foreground)]" />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              <input type="text" placeholder="Display name" value={(profile.display_name as string) || ""} onChange={(e) => updateProfile({ display_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Pick your vibe</h2>
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map((c) => (
                <button key={c} onClick={() => updateProfile({ theme_color: c })}
                  className={`h-12 rounded-xl transition ${profile.theme_color === c ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--muted-foreground)]" />
              <input type="color" value={(profile.theme_color as string) || "#FF6B8A"} onChange={(e) => updateProfile({ theme_color: e.target.value })}
                className="w-full h-10 rounded-xl cursor-pointer" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Name your co-mind</h2>
            <p className="text-sm text-[var(--muted-foreground)] text-center">What should Syne call itself?</p>
            <input type="text" placeholder="Syne" value={(profile.ai_name as string) || "Syne"} onChange={(e) => updateProfile({ ai_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-center text-lg font-semibold" />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Your love language</h2>
            <div className="space-y-2">
              {LOVE_LANGUAGES.map((ll) => (
                <button key={ll.key} onClick={() => updateProfile({ love_language: ll.key })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${profile.love_language === ll.key ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--card)]"}`}>
                  <ll.icon className="w-5 h-5 text-[var(--accent)]" />
                  <span className="text-sm font-medium">{ll.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Cycle tracking</h2>
            <p className="text-sm text-[var(--muted-foreground)] text-center">You can configure privacy settings later in the app.</p>
            <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center">
              <CalendarDays className="w-8 h-8 text-[var(--accent)] mx-auto mb-2" />
              <p className="text-sm font-medium">Adaptive cycle tracking</p>
              <p className="text-xs text-[var(--muted-foreground)]">Share only what you want with your partner</p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Connect with your partner</h2>
            {!pairingCode ? (
              <div className="space-y-4">
                <button onClick={handleGenerateCode} disabled={loading}
                  className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Pairing Code"}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted-foreground)]">or enter their code</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="6-digit code" maxLength={6} value={enteredCode} onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                  <button onClick={handleVerifyCode} disabled={loading || enteredCode.length !== 6}
                    className="px-4 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                  </button>
                </div>
                {pairingError && <p className="text-xs text-red-500 text-center">{pairingError}</p>}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-4xl font-mono font-bold tracking-widest text-[var(--accent)]">{pairingCode}</div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Expires in {pairingExpiry ? Math.max(0, Math.ceil((pairingExpiry.getTime() - Date.now()) / 1000 / 60)) : 0} minutes
                </p>
                <button onClick={() => { navigator.clipboard.writeText(pairingCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy code"}
                </button>
                <p className="text-xs text-[var(--muted-foreground)]">Share this code with your partner. Wait for them to connect.</p>
                <button onClick={() => { setPairingCode(""); setPairingExpiry(null); }}
                  className="text-xs text-[var(--muted-foreground)] underline">Generate new code</button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          <button onClick={prevStep} disabled={step === 0} className="p-2 rounded-full hover:bg-[var(--muted)] disabled:opacity-0 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition ${i === step ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
            ))}
          </div>
          <div className="w-9" />
        </div>

        {renderStep()}

        {step < STEPS - 1 && (
          <button onClick={nextStep}
            className="w-full mt-8 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
