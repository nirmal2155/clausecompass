import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        legal: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        risk: {
          high: {
            bg: "#fef2f2",
            border: "#f87171",
            text: "#991b1b",
            badge: "#dc2626",
          },
          negotiate: {
            bg: "#fffbeb",
            border: "#fde68a",
            text: "#92400e",
            badge: "#d97706",
          },
          standard: {
            bg: "#f0fdf4",
            border: "#bbf7d0",
            text: "#166534",
            badge: "#16a34a",
          },
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
