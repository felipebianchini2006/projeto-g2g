import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        meow: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#FF6B95",
          400: "#FF6B95",
          500: "#FF6B95",
          600: "#FF6B95",
          dark: "#881337",
          purple: "#A78BFA",
          purpleDeep: "#7C3AED",
          red: "#FF6B95", // primary
          deep: "#FF6B95",
          cream: "#FFFFFF",
          charcoal: "#1F2937",
          muted: "#6B7280",
          gold: "#FCD34D",
          indigo: "#4F46E5",
          indigoDark: "#4338CA",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"], // --font-body
        display: ["var(--font-display)", "sans-serif"], // --font-display
      },
      borderRadius: {
        "xl": "12px", // --radius-md
        "2xl": "16px", // --radius-lg
        "3xl": "20px",
      },
      boxShadow: {
        meow: "0 18px 45px rgba(31, 41, 55, 0.12)",
        card: "0 4px 15px rgba(15, 23, 42, 0.05)",
        cute: "0 10px 25px -5px rgba(255, 107, 149, 0.18)",
        focus: "0 0 0 4px rgba(255, 107, 149, 0.2)",
      },
      backgroundImage: {
        "meow-gradient": "linear-gradient(0deg, #ffffff 0%, #ffffff 100%)",
        "meow-linear": "linear-gradient(90deg, #f2a4c3 0%, #f7b8d1 50%, #f2a4c3 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
