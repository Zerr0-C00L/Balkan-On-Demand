/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        foreground: '#ffffff',
        primary: '#4ecca3',
        secondary: '#0f3460',
        accent: '#16213e',
        muted: '#6c757d'
      }
    },
  },
  plugins: [],
}
