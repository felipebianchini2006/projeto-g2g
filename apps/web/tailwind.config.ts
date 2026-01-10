import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        meow: {
          50: "#FFF0F5",
          100: "#FFE4E9",
          200: "#FDA4AF",
          300: "#FF6B95",
          400: "#F43F5E",
          500: "#E11D48",
          600: "#BE123C",
          dark: "#881337",
          purple: "#A78BFA",
          purpleDeep: "#7C3AED",
          red: "#FF6B95", // primary
          deep: "#F43F5E",
          cream: "#FFF0F5",
          charcoal: "#1F2937",
          muted: "#6B7280",
          gold: "#FCD34D",
          indigo: "#4F46E5",
          indigoDark: "#4338CA",
        },
      },
      fontFamily: {
        sans: ["Nunito", "sans-serif"], // --font-body
        display: ["Nunito", "sans-serif"], // --font-display
      },
      borderRadius: {
        "xl": "16px", // --radius-md
        "2xl": "24px", // --radius-lg
        "3xl": "32px",
      },
      boxShadow: {
        meow: "0 18px 45px rgba(31, 41, 55, 0.12)",
        card: "0 4px 15px rgba(15, 23, 42, 0.05)",
        cute: "0 10px 25px -5px rgba(255, 107, 149, 0.18)",
        focus: "0 0 0 4px rgba(255, 107, 149, 0.2)",
      },
      backgroundImage: {
        "meow-gradient":
          "radial-gradient(circle at top, #ffe9f3 0%, #fff7fb 55%, #f8fafc 100%)",
        "meow-linear":
          "linear-gradient(90deg, #FF6B95 0%, #FDA4AF 50%, #FF6B95 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
