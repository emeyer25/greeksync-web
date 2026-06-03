import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      colors: {
        navy: '#09090b',
        cream: '#fafaf9',
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4B86A',
          dark: '#A8893C',
        },
        burgundy: {
          DEFAULT: '#9B2335',
          light: '#e05469',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 220ms ease-out forwards',
        shimmer: 'shimmer 1.2s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
