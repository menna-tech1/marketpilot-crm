import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b14",
          900: "#0b1220",
          800: "#111a2b",
          700: "#1a2437",
        },
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bfd4ff",
          300: "#93b6ff",
          400: "#608eff",
          500: "#3b66f5",
          600: "#2a4ae0",
          700: "#2439b5",
          800: "#23348f",
          900: "#223072",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)",
        panel: "0 20px 50px -12px rgba(16,24,40,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
