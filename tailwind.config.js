/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // === PLAZA CACHEBUST KEYS (Guaranteed to change Tailwind hash) ===
      spacing: {
        "__plaza_cachebust_spacing_003": "7px",
      },
      colors: {
        "__plaza_cachebust_color_003": "#abcdef",
      },
      borderRadius: {
        "__plaza_cachebust_radius_003": "3px",
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
