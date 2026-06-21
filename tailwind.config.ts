import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#8A7342", "gold-soft": "#B79A5E", "gold-deep": "#6E5B33",
        charcoal: "#1C1A15", ink: "#14110B", ivory: "#F7F9FB", "ivory-2": "#E9EDF1",
        slate: "#2F4A4A", signal: "#2E5FE0", "signal-soft": "#6E92EC", line: "rgba(28,33,38,0.10)"
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans: ["Hanken Grotesk", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,24,28,0.04), 0 8px 24px -12px rgba(20,24,28,0.12)",
        lift: "0 8px 30px -10px rgba(20,24,28,0.22)"
      },
      borderRadius: { xl: "14px", "2xl": "20px" }
    }
  },
  plugins: []
};
export default config;
