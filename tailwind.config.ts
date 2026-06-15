import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#8A7342", "gold-soft": "#B79A5E", "gold-deep": "#6E5B33",
        charcoal: "#1C1A15", ink: "#14110B", ivory: "#FAF8F3", "ivory-2": "#F3EEE4",
        slate: "#2F4A4A", line: "rgba(28,26,21,0.10)"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,17,11,0.04), 0 8px 24px -12px rgba(20,17,11,0.12)",
        lift: "0 8px 30px -10px rgba(20,17,11,0.22)"
      },
      borderRadius: { xl: "14px", "2xl": "20px" }
    }
  },
  plugins: []
};
export default config;
