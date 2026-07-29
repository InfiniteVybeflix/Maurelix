"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a1a] flex flex-col items-center justify-center">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3e] to-[#2d1b4e]" />

      {/* Stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 5 + "s",
              animationDuration: Math.random() * 3 + 2 + "s",
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Shooting stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`shoot-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent shooting-star"
            style={{
              width: Math.random() * 100 + 80 + "px",
              top: Math.random() * 60 + "%",
              left: Math.random() * 80 + "%",
              animationDelay: Math.random() * 8 + i * 3 + "s",
              animationDuration: Math.random() * 1.5 + 1 + "s",
              transform: "rotate(-45deg)",
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 150px rgba(0,0,0,0.7)" }} />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#FF6B8A] rounded-full blur-3xl opacity-20 animate-pulse" style={{ transform: "scale(1.5)" }} />
          <img
            src="/icon-192x192.png"
            alt="Maurelix"
            className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl shadow-2xl animate-float"
            style={{
              boxShadow: "0 0 60px rgba(255,107,138,0.3), 0 0 120px rgba(255,107,138,0.1)",
            }}
          />
        </div>

        {/* Brand */}
        <h1
          className="text-5xl md:text-7xl font-bold tracking-tight mb-3"
          style={{
            background: "linear-gradient(135deg, #FF6B8A 0%, #e94560 50%, #FF6B8A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 40px rgba(255,107,138,0.3)",
          }}
        >
          Maurelix
        </h1>

        <p className="text-lg md:text-xl text-white/60 mb-2 font-light tracking-wide">
          Where Love Grows
        </p>

        <p className="text-sm md:text-base text-white/40 max-w-md mb-10 leading-relaxed">
          A private, encrypted sanctuary for two souls. Chat, remember, play, and grow together with Syne as your co-mind.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link
            href="/signup"
            className="group relative flex-1 py-4 px-8 rounded-2xl text-center font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #FF6B8A 0%, #e94560 100%)",
              boxShadow: "0 0 30px rgba(255,107,138,0.3)",
            }}
          >
            <span className="relative z-10">Begin Your Journey</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </Link>
          <Link
            href="/login"
            className="flex-1 py-4 px-8 rounded-2xl text-center font-semibold text-white/80 border border-white/10 backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
          >
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {["E2EE Chat", "Private Vault", "Memory Maps", "Couple Games", "Syne AI"].map((f) => (
            <span
              key={f}
              className="px-4 py-1.5 rounded-full text-[11px] font-medium text-white/50 border border-white/5 bg-white/5 backdrop-blur-sm"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF6B8A] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes shoot {
          0% { transform: translateX(0) translateY(0) rotate(-45deg); opacity: 1; }
          100% { transform: translateX(-300px) translateY(300px) rotate(-45deg); opacity: 0; }
        }
        .shooting-star {
          animation-name: shoot;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
