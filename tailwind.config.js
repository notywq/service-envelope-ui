/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
        },
        success: {
          50: '#f0fdf4',
          500: '#4caf50',
          600: '#43a047',
          700: '#388e3c',
        },
        warning: {
          50: '#fefce8',
          500: '#ff9800',
          600: '#f57c00',
          700: '#e65100',
        },
        error: {
          50: '#fef2f2',
          500: '#f44336',
          600: '#e53935',
          700: '#c62828',
        },
      },
    },
  },
  plugins: [],
}
