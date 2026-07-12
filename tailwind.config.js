/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // === PLAZA CACHEBUST KEYS ===
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

      // ⭐ Animation support for fadeInUp
      animation: {
        fadeInUp: "fadeInUp 0.4s ease forwards",
        fadeIn: "fadeIn 0.3s ease-out forwards",
      },

      keyframes: {
        fadeInUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
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
    require("@tailwindcss/forms"),
  ],
};
