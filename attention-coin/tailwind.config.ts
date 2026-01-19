import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark palette - refined for luxury feel
        background: '#030303',
        surface: '#0a0a0a',
        'surface-light': '#141414',
        'surface-elevated': '#1a1a1a',
        border: '#1f1f1f',
        'border-light': '#2a2a2a',
        // Primary - sophisticated emerald (less harsh than neon)
        primary: '#10b981',
        'primary-light': '#34d399',
        'primary-dim': '#059669',
        'primary-glow': 'rgba(16, 185, 129, 0.4)',
        // Secondary - soft violet
        secondary: '#a78bfa',
        'secondary-dim': '#8b5cf6',
        // Accent - warm coral for highlights
        accent: '#f43f5e',
        'accent-dim': '#e11d48',
        // Text colors - improved readability
        muted: '#737373',
        'muted-light': '#a3a3a3',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
      },
      animation: {
        // Ambient animations (can be longer)
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-soft': 'glowSoft 3s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        // UI animations - follow motion rules (150-250ms, ease-in-out)
        'slide-up': 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        glowSoft: {
          '0%': { opacity: '0.6', filter: 'blur(20px)' },
          '100%': { opacity: '0.8', filter: 'blur(30px)' },
        },
        // UI keyframes - subtle, per motion rules
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          // Per motion rules: scale 0.98 → 1
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(16, 185, 129, 0.15)',
        'glow-md': '0 0 24px rgba(16, 185, 129, 0.2)',
        'glow-lg': '0 0 40px rgba(16, 185, 129, 0.25)',
        'glow-primary': '0 0 30px rgba(16, 185, 129, 0.3)',
        'glow-secondary': '0 0 30px rgba(167, 139, 250, 0.3)',
        'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'elevation-2': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'elevation-3': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
export default config
