/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        dark: '#0f172a',
        'dark-light': '#1e293b',
        'dark-lighter': '#111827',
      },
    },
  },
  plugins: [],
};
