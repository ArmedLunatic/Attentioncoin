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
        // Base palette (dark-first)
        background: '#060608',
        'bg-secondary': '#0c0c10',
        'bg-tertiary': '#121218',
        'bg-elevated': '#18181f',

        // Borders
        'border-subtle': '#1e1e26',
        border: '#2a2a35',
        'border-emphasis': '#3a3a48',

        // Text hierarchy
        foreground: '#f4f4f5',
        'text-secondary': '#a1a1aa',
        'text-tertiary': '#71717a',
        'text-muted': '#52525b',

        // Refined Emerald (primary accent)
        emerald: {
          950: '#022c22',
          900: '#064e3b',
          800: '#065f46',
          700: '#047857',
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
        },

        // Refined Violet (secondary accent)
        violet: {
          950: '#1e1033',
          900: '#2e1065',
          800: '#4c1d95',
          700: '#6d28d9',
          600: '#7c3aed',
          500: '#8b5cf6',
          400: '#a78bfa',
        },

        // Semantic colors
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#0891b2',

        // Legacy aliases for compatibility
        surface: '#0c0c10',
        'surface-light': '#121218',
        'surface-elevated': '#18181f',
        muted: '#71717a',
        'muted-light': '#a1a1aa',
        primary: '#047857',
        'primary-light': '#10b981',
        'primary-dim': '#065f46',
        'foreground-muted': '#a1a1aa',
        'border-light': '#3a3a48',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'display-lg': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display-md': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-sm': ['1rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      letterSpacing: {
        'tighter': '-0.03em',
        'tight': '-0.02em',
      },
      lineHeight: {
        'relaxed': '1.75',
        'loose': '2',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'atmosphere': 'atmosphereDrift 25s ease-in-out infinite alternate',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        atmosphereDrift: {
          '0%': { backgroundPosition: '50% 0%, 80% 0%, 20% 0%' },
          '100%': { backgroundPosition: '45% 5%, 75% -5%, 25% 3%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'elevation': '0 4px 16px rgba(0, 0, 0, 0.3)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow-emerald': '0 0 20px rgba(4, 120, 87, 0.25)',
        'glow-emerald-lg': '0 0 40px rgba(4, 120, 87, 0.15)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #047857 0%, #065f46 50%, #064e3b 100%)',
        'gradient-text': 'linear-gradient(135deg, #f4f4f5 0%, #a1a1aa 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
