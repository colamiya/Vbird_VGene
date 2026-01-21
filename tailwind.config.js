/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00eaff',
        'neon-purple': '#bd00ff',
        'deep-space': '#050505',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      },
      dropShadow: {
        'neon': '0 0 10px rgba(0, 234, 255, 0.5)',
      }
    },
  },
  plugins: [],
}
