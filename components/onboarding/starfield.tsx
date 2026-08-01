"use client";

import { useMemo } from "react";

const Starfield = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.2 + 0.5,
      delay: Math.random() * 6,
      duration: Math.random() * 3 + 2,
      bright: Math.random() > 0.65,
    }));
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ perspective: "1000px" }}
    >
      <div
        className="absolute inset-[-50%]"
        style={{
          animation: "rotate-sky 180s linear infinite",
          transformStyle: "preserve-3d",
        }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: s.bright
                ? "rgba(255,200,220,0.85)"
                : "rgba(255,255,255,0.55)",
              boxShadow: s.bright
                ? `0 0 ${s.size * 3}px rgba(255,107,138,0.4)`
                : "none",
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
      <style jsx global>{\`
        @keyframes rotate-sky {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      \`}</style>
    </div>
  );
};

export default Starfield;
