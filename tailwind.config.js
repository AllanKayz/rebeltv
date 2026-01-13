/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js", "./src/**/*.{js,html}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          glow: 'rgba(59, 130, 246, 0.5)'
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(15, 23, 42, 0.8)',
          border: 'rgba(255, 255, 255, 0.1)'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'premium': '0 20px 50px rgba(0, 0, 0, 0.1)',
        'premium-dark': '0 20px 50px rgba(0, 0, 0, 0.3)',
      }
    }
  },
  plugins: [],
}
