"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else if (data.user) {
      setMessage("Check your email to confirm your account.");
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 40%, #1a1a3e 100%)" }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
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

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,107,138,0.15) 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-[#FF6B8A]/20 blur-2xl scale-150" />
            <img
              src="/logo.png"
              alt="Maurelix"
              className="relative h-16 w-16 object-contain drop-shadow-[0_0_20px_rgba(255,107,138,0.5)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Join Maurelix</h1>
          <p className="mt-2 text-white/50 text-sm">Start your journey together</p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 text-sm text-emerald-400 bg-emerald-400/10 px-4 py-3 rounded-xl text-center"
          >
            {message}
          </motion.div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#FF6B8A]/40 focus:ring-1 focus:ring-[#FF6B8A]/20 transition-all"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group w-full py-4 rounded-2xl text-white font-semibold text-sm btn-glow flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/40">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-[#FF6B8A] hover:text-[#ff8fa3] font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
