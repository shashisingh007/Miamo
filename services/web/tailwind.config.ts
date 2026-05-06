import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Miamo brand palette — Rose-Gold Premium
        miamo: {
          bg: '#050506',
          surface: '#0B0A0F',
          card: '#12111A',
          elevated: '#1A1620',
          soft: '#221C2A',
        },
        lavender: {
          50: '#FDF8F3',
          100: '#FAEEE4',
          200: '#F5D9C4',
          300: '#E8B89A',
          400: '#D4A574',
          500: '#C9956B',
          600: '#B8804A',
          700: '#9A6837',
          800: '#7D5229',
          900: '#5E3D1E',
        },
        violet: {
          deep: '#B8804A',
        },
        accent: {
          glow: '#E8C9A8',
        },
        text: {
          primary: '#F8F6F4',
          secondary: '#D4CEC8',
          muted: '#9A948E',
        },
        border: {
          DEFAULT: '#2A2420',
          light: '#3D3530',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-lavender': 'linear-gradient(135deg, #D4A574 0%, #B8804A 100%)',
        'gradient-glow': 'linear-gradient(135deg, #E8C9A8 0%, #D4A574 50%, #B8804A 100%)',
        'gradient-card': 'linear-gradient(180deg, #1A1620 0%, #12111A 100%)',
        'gradient-surface': 'linear-gradient(180deg, #0B0A0F 0%, #050506 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(212,165,116,0.15)',
        'glow-md': '0 0 30px rgba(212,165,116,0.2)',
        'glow-lg': '0 0 60px rgba(212,165,116,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(42,36,32,0.5)',
        'elevated': '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(42,36,32,0.6)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(212,165,116,0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(212,165,116,0.3)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
