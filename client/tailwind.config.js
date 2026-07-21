// Colors/radii/fonts all resolve to CSS custom properties defined in
// src/styles/theme.css — components use these token names (bg-surface,
// text-ink-900, etc.) instead of ever hardcoding hex values, so swapping
// the active theme class on <html> is the only thing that needs to change.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        border: 'var(--border)',
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          ink: 'var(--accent-ink)'
        },
        success: 'var(--success)',
        danger: 'var(--danger)',
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
        DEFAULT: 'var(--radius)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: []
};
