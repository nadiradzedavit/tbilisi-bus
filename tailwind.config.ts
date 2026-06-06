import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0e1a",
          elevated: "#10162600",
          card: "#131a2c",
        },
        fg: {
          DEFAULT: "#f1f5f9",
          muted: "#94a3b8",
          dim: "#64748b",
        },
        border: {
          DEFAULT: "#1f2937",
          strong: "#334155",
        },
        brand: {
          bus: "#2563eb",
          minibus: "#ea580c",
          metro: "#0891b2",
          cable: "#16a34a",
        },
        status: {
          live: "#10b981",
          delay: "#f59e0b",
          gone: "#475569",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "ticker": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "ticker": "ticker 40s linear infinite",
        "shimmer": "shimmer 1.5s infinite",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgb(255 255 255 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.03) 1px, transparent 1px)",
      },
      boxShadow: {
        "glow-bus": "0 0 24px -4px rgba(37, 99, 235, 0.5)",
        "glow-live": "0 0 16px -2px rgba(16, 185, 129, 0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
