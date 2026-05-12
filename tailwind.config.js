/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["'Plus Jakarta Sans'", "sans-serif"] },
      colors: {
        base: { DEFAULT: "#e8e0ec", 2: "#d4cce0" },
        card: { DEFAULT: "#2d2640", 2: "#3a3050" },
        peach: "#f0a070",
        amber2: "#e8803a",
        coral: "#d4706a",
        orb: { purple: "#7060c0", indigo: "#5040a0", gold: "#c08050" },
        muted: "#b8aec8",
        light: "#f0ece8",
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },
      backdropBlur: { "2xl": "40px" },
      boxShadow: {
        glass: "0 20px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
        orb: "0 12px 40px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
        glow: "0 6px 24px rgba(232,128,58,0.4)",
      },
    },
  },
  plugins: [],
};
