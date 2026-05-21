import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === MIAMO FINAL COLOR SYSTEM (Light Premium) ===
        // Surfaces
        miamo: {
          bg: '#FAF8F5',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          elevated: '#F7F5F2',
          input: '#FFFFFF',
        },
        // Accent Rose-Gold (Warm Copper — No Pink)
        rose: {
          DEFAULT: '#C97856',
          main: '#C97856',
          alt: '#D4896A',
          dark: '#B8694A',
          light: '#E8A87C',
          soft: '#F5EDE8',
          vlight: '#FAF5F2',
          gold: '#D4896A',
          copper: '#C97856',
          blush: '#E8CFC4',
        },
        // Text colors
        text: {
          primary: '#111111',
          secondary: '#5F5A55',
          muted: '#8B8680',
          placeholder: '#A8A3A0',
          disabled: '#CFCBC7',
        },
        // Feedback
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Borders
        border: {
          DEFAULT: '#E8E4DF',
          light: '#F0EDE9',
          focus: '#C97856',
        },
        // Sidebar
        sidebar: {
          bg: '#FFFFFF',
          hover: '#F5F5F5',
          active: '#C97856',
        },
        // Chat
        chat: {
          sent: '#C97856',
          received: '#F5F5F5',
          bg: '#FAF8F5',
        },
        // Premium Deep Accents
        deep: {
          indigo: '#180066',
          purple: '#100096',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', "'Times New Roman'", 'serif'],
      },
      backgroundImage: {
        'gradient-rose': 'linear-gradient(135deg, #C97856, #D4896A)',
        'gradient-rose-gold': 'linear-gradient(135deg, #C97856 0%, #D4896A 50%, #E8A87C 100%)',
        'gradient-rose-soft': 'linear-gradient(135deg, #F5EDE8, #E8CFC4)',
        'gradient-hover': 'linear-gradient(135deg, #B8694A, #C97856)',
        'gradient-premium': 'linear-gradient(135deg, #C97856 0%, #D4896A 40%, #E8A87C 100%)',
        'gradient-luxury': 'linear-gradient(160deg, #C97856 0%, #B8694A 30%, #180066 100%)',
        'gradient-deep': 'linear-gradient(135deg, #180066, #100096)',
        'gradient-copper': 'linear-gradient(135deg, #D4896A, #C97856)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(201,120,86,0.04))',
        'gradient-3d': 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(201,120,86,0.04) 100%)',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'medium': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'strong': '0 16px 48px rgba(0, 0, 0, 0.12)',
        'rose': '0 8px 24px rgba(201, 120, 86, 0.18)',
        'rose-glow': '0 0 40px rgba(201, 120, 86, 0.12), 0 8px 32px rgba(201, 120, 86, 0.15)',
        'rose-gold': '0 8px 24px rgba(212, 137, 106, 0.20)',
        'card-hover': '0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(201, 120, 86, 0.06)',
        'card-3d': '0 4px 6px rgba(0,0,0,0.04), 0 10px 24px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.04)',
        'button': '0 6px 20px rgba(201, 120, 86, 0.25), 0 2px 6px rgba(201, 120, 86, 0.12)',
        'button-hover': '0 10px 30px rgba(201, 120, 86, 0.3), 0 4px 10px rgba(201, 120, 86, 0.15)',
        'glow': '0 0 20px rgba(201, 120, 86, 0.15)',
        'glow-sm': '0 0 10px rgba(201, 120, 86, 0.10)',
        'glow-lg': '0 0 60px rgba(201, 120, 86, 0.12), 0 0 20px rgba(212, 137, 106, 0.08)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        'depth': '0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.06)',
        'premium-float': '0 20px 60px rgba(201, 120, 86, 0.10), 0 8px 20px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'rose-spin': 'roseSpin 10s linear infinite',
        'depth-breathe': 'depthBreathe 4s ease-in-out infinite',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'heart-float': 'heartFloat 3s ease-in-out infinite',
        'copper-shimmer': 'copperShimmer 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(232,93,117,0.05)' },
          '100%': { boxShadow: '0 0 30px rgba(232,93,117,0.15)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
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
          '0%, 100%': { boxShadow: '0 0 15px rgba(232,93,117,0.10)' },
          '50%': { boxShadow: '0 0 40px rgba(232,93,117,0.18)' },
        },
        roseSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        depthBreathe: {
          '0%, 100%': { transform: 'translateZ(0) scale(1)', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' },
          '50%': { transform: 'translateZ(20px) scale(1.01)', boxShadow: '0 20px 50px rgba(0,0,0,0.10)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        heartFloat: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '25%': { transform: 'translateY(-6px) scale(1.1)' },
          '50%': { transform: 'translateY(-2px) scale(1.05)' },
          '75%': { transform: 'translateY(-8px) scale(1.12)' },
        },
        copperShimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
