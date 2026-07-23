// Colors/radii/fonts all resolve to CSS custom properties defined in
// src/styles/theme.css — components use these token names (bg-surface,
// text-ink-900, etc.) instead of ever hardcoding hex values, so swapping
// the active theme class on <html> is the only thing that needs to change.
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)'
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          300: 'var(--ink-300)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          ink: 'var(--accent-ink)',
          light: 'var(--accent-light)'
        },
        success: {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
          ink: 'var(--success-ink)'
        },
        danger: {
          DEFAULT: 'var(--danger)',
          light: 'var(--danger-light)',
          ink: 'var(--danger-ink)'
        },
        warning: {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
          ink: 'var(--warning-ink)'
        },
        info: {
          DEFAULT: 'var(--info)',
          light: 'var(--info-light)',
          ink: 'var(--info-ink)'
        },
        microsoft: {
          blue: '#0067b8',
          hover: '#005da6'
        },
        sidebar: {
          bg: 'var(--sidebar-bg)',
          hover: 'var(--sidebar-bg-hover)',
          text: 'var(--sidebar-text)',
          textStrong: 'var(--sidebar-text-strong)',
          activeBg: 'var(--sidebar-active-bg)',
          activeText: 'var(--sidebar-active-text)',
          border: 'var(--sidebar-border)'
        }
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: [tailwindcssAnimate]
};
