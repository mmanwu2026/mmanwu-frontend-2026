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

  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
      backgroundColor: ["disabled"],
    },
  },

  plugins: [
    // === Adding a plugin forces a full Tailwind rebuild ===
    require("@tailwindcss/forms"),
  ],
};
