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
          dark: "#1a1a2e",
          accent: "#e94560",
          cream: "#FFF8F0",
        },
      },
    },
  },
  plugins: [],
};
export default config;