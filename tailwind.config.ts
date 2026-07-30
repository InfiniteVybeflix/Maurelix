import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        maurelix: {
          light: "#FF6B8A",
          dark: "#0a0a1a",
          accent: "#e94560",
          cream: "#FFF8F0",
          cosmic: "#1a1a3e",
          nebula: "#2d1b4e",
          stardust: "#f0e6ff",
        },
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "shooting-star": "shootingStar 2s linear forwards",
        "twinkle": "twinkle 4s ease-in-out infinite",
        "orbit": "orbit 20s linear infinite",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "scale-in": "scaleIn 0.5s ease-out forwards",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255,107,138,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255,107,138,0.6), 0 0 80px rgba(233,69,96,0.2)" },
        },
        shootingStar: {
          "0%": { transform: "translateX(0) translateY(0) rotate(-45deg) scale(1)", opacity: "1" },
          "100%": { transform: "translateX(-500px) translateY(500px) rotate(-45deg) scale(0)", opacity: "0" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(100px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(100px) rotate(-360deg)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundImage: {
        "cosmic-gradient": "linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #2d1b4e 100%)",
        "nebula-gradient": "radial-gradient(ellipse at top, #2d1b4e 0%, #0a0a1a 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
