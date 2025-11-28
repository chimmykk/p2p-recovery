import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional Purple/Violet Brand Palette
        brand: {
          50: "#f5f4fc",
          100: "#ebe9f8",
          200: "#d9d6f3",
          300: "#bfb8ea",
          400: "#a199de",
          500: "#8984d9", // Primary brand color - #8984D9
          600: "#7469ce",
          700: "#6555b9",
          800: "#534798",
          900: "#453d7b",
          950: "#2b2651",
        },
        // Secondary button color
        secondary: {
          DEFAULT: "#d6d6d7",
          hover: "#c5c5c6",
          dark: "#a8a8a9",
        },
        // Neutral palette for minimal design
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Semantic colors
        success: {
          light: "#d1fae5",
          DEFAULT: "#10b981",
          dark: "#047857",
        },
        warning: {
          light: "#fef3c7",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        error: {
          light: "#fee2e2",
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
        info: {
          light: "#dbeafe",
          DEFAULT: "#3b82f6",
          dark: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        minimal: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        soft: "0 2px 8px 0 rgb(0 0 0 / 0.08)",
        medium: "0 4px 16px 0 rgb(0 0 0 / 0.1)",
        strong: "0 8px 24px 0 rgb(0 0 0 / 0.12)",
        brand: "0 4px 16px 0 rgb(168 85 247 / 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
