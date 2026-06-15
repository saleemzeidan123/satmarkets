import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { gold: "#8A7342", charcoal: "#222222", ivory: "#FAF8F3", slate: "#2F4A4A" },
      fontFamily: { serif: ["Georgia", "serif"], sans: ["system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
