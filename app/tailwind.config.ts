import type { Config } from "tailwindcss";

// Charte Artizen — OR / NOIR / CRÈME
// Pensée mobile-first : contraste élevé pour lecture en plein soleil,
// touches généreuses pour usage avec gants ou doigts mouillés.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Or : utilisé pour boutons primaires, badges, accents
        gold: {
          DEFAULT: "#C9A227",
          50: "#FBF5DD",
          100: "#F6EBB8",
          200: "#EFD970",
          300: "#E5C46A",
          400: "#D9B349",
          500: "#C9A227",  // DEFAULT
          600: "#A88820",
          700: "#86691A",
          800: "#5E4912",
          900: "#39290A"
        },
        // Noir : titres, header, boutons secondaires
        ink: {
          DEFAULT: "#0a0a0a",
          50: "#F4F4F5",
          100: "#E4E4E7",
          200: "#A1A1AA",
          300: "#71717A",
          400: "#52525B",
          500: "#3F3F46",
          700: "#27272A",
          800: "#18181B",
          900: "#0a0a0a",  // DEFAULT
          950: "#000000"
        },
        // Crème : fond principal, plus chaud que blanc pur
        cream: {
          DEFAULT: "#FAF8F1",
          50: "#FEFDFA",
          100: "#FAF8F1",  // DEFAULT
          200: "#F0EFEB",
          300: "#E5E2D9"
        },
        success: "#0F7B3F",
        warning: "#D97706",
        danger: "#B91C1C",
        border: "#E5E2D9"
      },
      fontFamily: {
        // Inter pour le corps, à charger via next/font dans layout.tsx.
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        // Ombre douce caractéristique de l'app (boutons / cards)
        soft: "0 2px 6px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.04)",
        lift: "0 8px 24px rgba(10, 10, 10, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
