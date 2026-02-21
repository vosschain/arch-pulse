import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(239,68,68,0)" },
          "50%": { boxShadow: "0 0 18px 4px rgba(239,68,68,0.7)" },
        },
        "pulse-fast": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(239,68,68,0)" },
          "50%": { boxShadow: "0 0 22px 6px rgba(239,68,68,0.85)" },
        },
        "pulse-critical": {
          "0%, 100%": { boxShadow: "0 0 14px 4px rgba(239,68,68,0.9)" },
          "50%": { boxShadow: "0 0 28px 10px rgba(239,68,68,1)" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "pulse-fast": "pulse-fast 1s ease-in-out infinite",
        "pulse-critical": "pulse-critical 0.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
