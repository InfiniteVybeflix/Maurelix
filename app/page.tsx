"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, MapPin, Gamepad2, Sparkles, Heart } from "lucide-react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  delay: number;
}

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Encrypted Chat",
    description: "End-to-end encrypted conversations in a shared space and private vault.",
    color: "#FF6B8A",
  },
  {
    icon: Shield,
    title: "Private Vault",
    description: "Your most intimate thoughts, safely locked away from prying eyes.",
    color: "#a78bfa",
  },
  {
    icon: MapPin,
    title: "Memory Maps",
    description: "Pin your special moments across the world and unlock them together.",
    color: "#60a5fa",
  },
  {
    icon: Gamepad2,
    title: "Couple Games",
    description: "Play, compete, and discover each other through fun interactive games.",
    color: "#fbbf24",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [stars, setStars] = useState<Star[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const shootingIdRef = useRef(0);

  // Generate static stars once
  useEffect(() => {
    const s: Star[] = [];
    for (let i = 0; i < 150; i++) {
      s.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      });
    }
    setStars(s);
  }, []);

  // Shooting stars
  const spawnShootingStar = useCallback(() => {
    const id = shootingIdRef.current++;
    const startX = 50 + Math.random() * 50;
    const startY = Math.random() * 30;
    setShootingStars((prev) => [...prev, { id, startX, startY, delay: 0 }]);
    setTimeout(() => {
      setShootingStars((prev) => prev.filter((s) => s.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    const interval = setInterval(spawnShootingStar, 3000 + Math.random() * 4000);
    spawnShootingStar();
    return () => clearInterval(interval);
  }, [spawnShootingStar]);

  // Mouse parallax
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 30%, #1a1a3e 70%, #2d1b4e 100%)" }}
    >
      {/* Deep space nebula layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(255,107,138,0.15) 0%, transparent 70%)",
            transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px)`,
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
            transform: `translate(${-mousePos.x * 0.015}px, ${-mousePos.y * 0.015}px)`,
          }}
        />
        <div
          className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)",
            transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`,
          }}
        />
      </div>

      {/* Static twinkling stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: star.size > 2 ? "rgba(255,200,220,0.9)" : "rgba(255,255,255,0.8)",
              boxShadow: star.size > 2 ? `0 0 ${star.size * 3}px rgba(255,200,220,0.5)` : "none",
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Shooting stars */}
      <AnimatePresence>
        {shootingStars.map((ss) => (
          <motion.div
            key={ss.id}
            className="absolute pointer-events-none"
            style={{ left: `${ss.startX}%`, top: `${ss.startY}%` }}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-200, -600], y: [0, 400] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div
              className="w-32 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
                transform: "rotate(-45deg)",
                boxShadow: "0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,200,220,0.3)",
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Orbit rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full border border-white/[0.03]"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF6B8A]/30" />
        </motion.div>
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full border border-white/[0.05]"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#a78bfa]/30" />
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Maurelix"
              className="h-10 w-10 object-contain drop-shadow-[0_0_10px_rgba(255,107,138,0.5)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            <div className="absolute inset-0 rounded-full bg-[#FF6B8A]/20 blur-xl" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Maurelix</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/login")}
            className="px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            Log In
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-full btn-glow"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-8 md:pt-24">
        {/* Logo glow */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3, type: "spring" }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 rounded-full bg-[#FF6B8A]/20 blur-3xl scale-150" />
          <img
            src="/logo.png"
            alt="Maurelix"
            className="relative h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-[0_0_30px_rgba(255,107,138,0.6)]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
        >
          <span className="text-white">Where Love </span>
          <span className="gradient-text">Grows</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-6 max-w-lg text-center text-base md:text-lg text-white/60 leading-relaxed"
        >
          A private, encrypted sanctuary for two souls. Chat, plan, remember, and grow together with Maurelix Syne as your co-mind.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={() => router.push("/signup")}
            className="group relative px-8 py-4 text-base font-semibold text-white rounded-2xl btn-glow overflow-hidden"
            style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Start Your Journey
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-4 text-base font-medium text-white/70 hover:text-white rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
          >
            Already Together? Sign In
          </button>
        </motion.div>
      </div>

      {/* Feature Cards */}
      <div className="relative z-10 px-6 md:px-12 pb-20 pt-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 + i * 0.15 }}
              className="group relative glow-card rounded-2xl p-6 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`,
                  border: `1px solid ${feature.color}30`,
                }}
              >
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              <div
                className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, transparent, ${feature.color}60, transparent)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0a0a1a, transparent)" }}
      />

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="relative z-10 text-center py-6 text-white/20 text-xs"
      >
        <p>Built with cosmic care by Aevibron</p>
      </motion.footer>
    </div>
  );
}
