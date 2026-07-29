"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Heart, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/app");
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Heart className="w-10 h-10 text-[var(--accent)] fill-[var(--accent)] mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Sign in to Maurelix</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted-foreground)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <div className="space-y-2">
          <button onClick={() => handleOAuth("google")}
            className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium hover:bg-[var(--muted)] transition">
            Continue with Google
          </button>
          <button onClick={() => handleOAuth("github")}
            className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium hover:bg-[var(--muted)] transition">
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Don&apos;t have an account? <Link href="/signup" className="text-[var(--accent)] font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
