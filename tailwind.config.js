/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0faf4',
          100: '#eaf7ef',
          200: '#dcf2e6',
          300: '#b6dfc8',
          400: '#4caf7d',
          500: '#2e9e5b',
          600: '#1e8a52',
          700: '#1b5e35',
          800: '#144d2a',
          900: '#0f3d20',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        green: '0 4px 14px rgba(46, 158, 91, 0.28)',
        'green-lg': '0 6px 24px rgba(46, 158, 91, 0.22)',
      },
    },
  },
  plugins: [],
}