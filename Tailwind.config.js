/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fafa",
          100: "#cdf0f0",
          200: "#9ae1e1",
          300: "#5ec9cc",
          400: "#2badb2",
          500: "#0e8f96",
          600: "#0a717a",
          700: "#085660",
          800: "#083d47",
          900: "#052530",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};