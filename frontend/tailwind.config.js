/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1E1B4B', 50: '#EEEDF9', 100: '#D5D3F2', 200: '#AAA7E5', 300: '#7F7BD8', 400: '#544FCB', 500: '#1E1B4B', 600: '#18153C', 700: '#12102D', 800: '#0C0B1E', 900: '#06050F' },
        accent: { DEFAULT: '#C026D3', 50: '#FCE8FD', 100: '#F8CFFB', 200: '#F19FF7', 300: '#EA6FF3', 400: '#E33FEF', 500: '#C026D3', 600: '#9A1EA8', 700: '#73177E', 800: '#4D0F54', 900: '#26082A' },
        purple: { DEFAULT: '#7C3AED', 50: '#F3EFFE', 100: '#E5DAFD', 200: '#CBB5FB', 300: '#B190F9', 400: '#976BF7', 500: '#7C3AED', 600: '#632EBE', 700: '#4A238E', 800: '#32175F', 900: '#190C2F' },
        dark: { DEFAULT: '#0F0F1A', card: '#1A1A2E', border: '#2D2D4E', muted: '#94A3B8' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: { 'fade-in': 'fadeIn 0.3s ease-in-out', 'slide-in': 'slideIn 0.3s ease-out', 'pulse-slow': 'pulse 3s infinite' },
      keyframes: { fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } }, slideIn: { '0%': { transform: 'translateX(-10px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } } },
    },
  },
  plugins: [],
};
