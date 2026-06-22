/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3B5BDB',
          600: '#3451c7',
          700: '#2d44ad',
          800: '#1e3a8a',
          900: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
}
