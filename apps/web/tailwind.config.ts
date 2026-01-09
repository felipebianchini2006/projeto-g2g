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
          red: "#f2a4c3", // --red
          deep: "#d86b95", // --deep-red
          cream: "#fff3f8", // --cream
          charcoal: "#402532", // --charcoal
          muted: "#7b5f6a", // --muted
          gold: "#ffcc8b", // --gold
          indigo: "#4c4bec", // --indigo
          dark: "#1b1216", // Footer bg
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
        meow: "0 18px 45px rgba(64, 37, 50, 0.16)", // --shadow
      },
      backgroundImage: {
        "meow-gradient":
          "radial-gradient(circle at top, #ffe9f3 0%, #fff7fb 50%, #ffffff 100%)",
        "meow-linear":
          "linear-gradient(90deg, #d86b95 0%, #f2a4c3 50%, #d86b95 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
