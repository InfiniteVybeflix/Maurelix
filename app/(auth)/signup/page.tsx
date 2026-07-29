"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else if (data.session) router.push("/app");
    else setMessage("Check your email for a confirmation link.");
  };

  const handleOAuth = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a1a]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3e] to-[#2d1b4e]" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icon-192x192.png" alt="Maurelix" className="w-16 h-16 mx-auto mb-4 rounded-2xl" style={{ boxShadow: "0 0 30px rgba(255,107,138,0.3)" }} />
          <h1 className="text-2xl font-bold text-white">Join Maurelix</h1>
          <p className="text-sm text-white/50">Start your journey together</p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" required placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF6B8A] focus:border-transparent" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF6B8A] focus:border-transparent" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="password" required placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF6B8A] focus:border-transparent" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #FF6B8A 0%, #e94560 100%)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button onClick={handleOAuth}
          className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition">
          Continue with Google
        </button>

        <p className="text-center text-xs text-white/40 mt-6">
          Already have an account? <Link href="/login" className="text-[#FF6B8A] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
