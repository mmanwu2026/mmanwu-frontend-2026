/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // === REAL CACHEBUST KEY ===
      spacing: {
        "__plaza_cachebust_002": "1px",
      },

      // Keep your previous dummy key (harmless)
      dummy: {},
    },
  },

  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
      backgroundColor: ["disabled"],
    },
  },

  plugins: [],
};
