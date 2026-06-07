// tailwind.config.cjs — Tailwind v4 format

import { defineConfig } from "tailwindcss";

export default defineConfig({
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],

  safelist: [
    "ascension-ring",
    "ascension-halo",
    "spirit-spark",
    "spirit-particle",
    "surge-flash",
    "surge-ripple",
  ],

  theme: {
    extend: {},
  },
});
