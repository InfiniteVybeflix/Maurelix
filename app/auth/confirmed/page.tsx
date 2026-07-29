"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a1a]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3e] to-[#2d1b4e]" />
      <div className="relative z-10 text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Email Confirmed</h1>
        <p className="text-sm text-white/50 mb-6">Your account is ready. Welcome to Maurelix.</p>
        <Link href="/app"
          className="inline-block py-3 px-8 rounded-xl text-white font-medium text-sm"
          style={{ background: "linear-gradient(135deg, #FF6B8A 0%, #e94560 100%)" }}>
          Enter Maurelix
        </Link>
      </div>
    </div>
  );
}
