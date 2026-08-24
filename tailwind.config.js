/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🚀 1. CORES DA MARCA (Permite mudar a cor do sistema inteiro num só lugar no futuro)
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1', // Atual indigo-500
          600: '#4f46e5', // Atual indigo-600
          700: '#4338ca', // Atual indigo-700
          900: '#312e81', // Atual indigo-900
        }
      },
      // 🚀 2. ÁREAS SEGURAS PWA (Impede que o sistema fique por baixo da câmara do iPhone)
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    },
  },
  plugins: [],
}