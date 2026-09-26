/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#0d0d10',
          800: '#16161a',
          700: '#1f1f24',
          600: '#2a2a31',
        },
        accent: {
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
    },
  },
  plugins: [],
};
