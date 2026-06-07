/** @type {import('tailwindcss').Config} */
module.exports = {
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
  plugins: [],
};
