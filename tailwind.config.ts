import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14181B", "ink-2": "#2B3138",
        cool: "#F6F8FB", paper: "#FFFFFF",
        silver: "#E9EDF1", "silver-2": "#D7DDE5",
        slate: "#5B6470", "slate-2": "#8A93A0", mid: "#9AA3AE",
        harbor: "#3A6EA5", "harbor-d": "#2C557F",
        azure: "#2E5FE0", "azure-d": "#1E47B0", "azure-l": "#6E92EE", "azure-wash": "#EAF0FE",
        brass: "#A88B5C", stone: "#EDE7DC",
        green: "#1F8A5B", "green-wash": "#E7F4ED", "green-line": "#BFE3CF",
        amber: "#B7791F", red: "#C8412E",
        line: "rgba(28,33,38,0.10)",
        charcoal: "#14181B",
        ivory: "#F6F8FB", "ivory-2": "#E9EDF1",
        signal: "#2E5FE0", "signal-soft": "#6E92EE",
        gold: "#3A6EA5", "gold-soft": "#6E92EE", "gold-deep": "#2C557F"
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans: ["Hanken Grotesk", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        "sh-1": "0 2px 8px rgba(20,24,27,.05)",
        "sh-2": "0 4px 16px rgba(20,24,27,.07)",
        "sh-3": "0 18px 50px rgba(20,24,27,.14)",
        card: "0 1px 2px rgba(20,24,28,0.04), 0 8px 24px -12px rgba(20,24,28,0.12)",
        lift: "0 8px 30px -10px rgba(20,24,28,0.22)"
      },
      borderRadius: { xl: "14px", "2xl": "20px" }
    }
  },
  plugins: []
};
export default config;
