import Link from "next/link";
import { Heart, Shield, MessageCircle, MapPin, Gamepad2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-[var(--accent)] fill-[var(--accent)]" />
          <span className="text-xl font-bold">Maurelix</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <div className="mb-6">
          <Heart className="w-16 h-16 text-[var(--accent)] fill-[var(--accent)] mx-auto animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
          Where Love <span className="text-[var(--accent)]">Grows</span>
        </h1>
        <p className="text-lg text-[var(--muted-foreground)] mb-10 max-w-xl">
          A private, encrypted space for two. Chat, plan, remember, and grow together with Maurelix Syne as your co-mind.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mb-10">
          {[
            { icon: MessageCircle, label: "Encrypted Chat" },
            { icon: Shield, label: "Private Vault" },
            { icon: MapPin, label: "Memory Maps" },
            { icon: Gamepad2, label: "Couple Games" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
              <f.icon className="w-6 h-6 text-[var(--accent)]" />
              <span className="text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>
        <Link href="/signup" className="px-8 py-3 rounded-full bg-[var(--accent)] text-white font-semibold text-lg hover:opacity-90 transition shadow-lg">
          Start Your Journey
        </Link>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-[var(--muted-foreground)]">
        Built with zero recurring cost. Powered by Aevibron.
      </footer>
    </div>
  );
}
