import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Miamo brand palette — Soft Pink & Magenta
        miamo: {
          bg: '#FDF2F5',
          surface: '#FFF5F8',
          card: '#FFFFFF',
          elevated: '#FFF0F4',
          soft: '#FCE4EC',
        },
        lavender: {
          50: '#FFF0F5',
          100: '#FCE4EC',
          200: '#F8BBD0',
          300: '#F48FB1',
          400: '#EC407A',
          500: '#E91E63',
          600: '#D81B60',
          700: '#C2185B',
          800: '#AD1457',
          900: '#880E4F',
        },
        violet: {
          deep: '#AD1457',
        },
        accent: {
          glow: '#FF80AB',
        },
        text: {
          primary: '#2D1B2E',
          secondary: '#5C3D5E',
          muted: '#9C7B9E',
        },
        border: {
          DEFAULT: '#F3D4DE',
          light: '#F8E1EA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-lavender': 'linear-gradient(135deg, #EC407A 0%, #D81B60 100%)',
        'gradient-glow': 'linear-gradient(135deg, #FF80AB 0%, #EC407A 50%, #D81B60 100%)',
        'gradient-card': 'linear-gradient(180deg, #FFFFFF 0%, #FFF5F8 100%)',
        'gradient-surface': 'linear-gradient(180deg, #FFF5F8 0%, #FDF2F5 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(236,64,122,0.15)',
        'glow-md': '0 0 30px rgba(236,64,122,0.2)',
        'glow-lg': '0 0 60px rgba(236,64,122,0.25)',
        'card': '0 4px 24px rgba(173,20,87,0.08), 0 0 0 1px rgba(243,212,222,0.5)',
        'elevated': '0 8px 32px rgba(173,20,87,0.12), 0 0 0 1px rgba(243,212,222,0.6)',
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
          '0%': { boxShadow: '0 0 15px rgba(236,64,122,0.1)' },
          '100%': { boxShadow: '0 0 30px rgba(236,64,122,0.3)' },
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
