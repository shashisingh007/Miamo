import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Miamo brand palette — Premium Pink & Gold
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
        gold: {
          50: '#FFFDF5',
          100: '#FFF8E1',
          200: '#FFECB3',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',
          600: '#FFB300',
          700: '#FF8F00',
          800: '#FF6F00',
          900: '#E65100',
        },
        violet: {
          deep: '#AD1457',
        },
        accent: {
          glow: '#FF80AB',
          gold: '#FFD700',
          rose: '#FF6B9D',
        },
        text: {
          primary: '#1A0A1E',
          secondary: '#4A2C4E',
          muted: '#8B6B8E',
        },
        border: {
          DEFAULT: '#F3D4DE',
          light: '#F8E1EA',
          gold: '#FFD70033',
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
        'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)',
        'gradient-premium': 'linear-gradient(135deg, #EC407A 0%, #AD1457 50%, #880E4F 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,240,245,0.7) 100%)',
        'gradient-elite': 'linear-gradient(135deg, #EC407A 0%, #D81B60 40%, #AD1457 70%, #880E4F 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(236,64,122,0.15)',
        'glow-md': '0 0 30px rgba(236,64,122,0.2)',
        'glow-lg': '0 0 60px rgba(236,64,122,0.25)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.3)',
        'card': '0 4px 24px rgba(173,20,87,0.08), 0 0 0 1px rgba(243,212,222,0.5)',
        'card-premium': '0 8px 40px rgba(236,64,122,0.08), 0 2px 8px rgba(173,20,87,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
        'elevated': '0 8px 32px rgba(173,20,87,0.12), 0 0 0 1px rgba(243,212,222,0.6)',
        'glass': '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        'premium': '0 20px 60px rgba(236,64,122,0.15), 0 8px 24px rgba(173,20,87,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '64px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'mirror-sweep': 'mirrorSweep 4s ease-in-out infinite',
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
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(236,64,122,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(236,64,122,0.4), 0 0 80px rgba(236,64,122,0.1)' },
        },
        mirrorSweep: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '50%, 100%': { transform: 'translateX(200%) skewX(-15deg)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
