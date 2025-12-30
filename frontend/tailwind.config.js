/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'marvel-red': '#D81B1F',
        'marvel-black': '#202020',
        'marvel-dark': '#151515',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
