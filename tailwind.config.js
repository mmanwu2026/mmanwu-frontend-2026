// tailwind.config.js — Tailwind v4 format
import { defineConfig } from "tailwindcss";

export default defineConfig({
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // === PLAZA CACHEBUST KEYS (Guaranteed to change Tailwind hash) ===
      spacing: {
        "__plaza_cachebust_spacing_004": "11px",
      },
      colors: {
        "__plaza_cachebust_color_004": "#fedcba",
      },
      borderRadius: {
        "__plaza_cachebust_radius_004": "5px",
      },
      fontSize: {
        "__plaza_cachebust_font_004": "13px",
      },

      // Keep your previous dummy key (harmless)
      dummy: {},
    },
  },
});
