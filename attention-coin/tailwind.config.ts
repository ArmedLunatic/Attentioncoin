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
        // Premium charcoal palette - infrastructure-grade
        background: '#0c0c0e',
        surface: '#121214',
        'surface-light': '#18181b',
        'surface-elevated': '#1e1e22',
        border: '#27272a',
        'border-light': '#3f3f46',
        // Primary accent - restrained slate blue (used sparingly)
        primary: '#64748b',
        'primary-light': '#94a3b8',
        'primary-dim': '#475569',
        // Text colors - soft off-white and muted grays
        foreground: '#fafaf9',
        'foreground-muted': '#e7e5e4',
        muted: '#71717a',
        'muted-light': '#a1a1aa',
        // Functional colors (minimal use)
        success: '#6b7280',
        warning: '#78716c',
        error: '#7f7f7f',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      letterSpacing: {
        'tighter': '-0.03em',
        'tight': '-0.02em',
      },
      lineHeight: {
        'relaxed': '1.75',
        'loose': '2',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'elevation': '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
export default config
