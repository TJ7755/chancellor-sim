/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['IBM Plex Sans', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-surface': 'var(--color-bg-surface)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'treasury-red': 'var(--color-treasury-red)',
        'treasury-red-hover': 'var(--color-treasury-red-hover)',
        'ink-blue': 'var(--color-ink-blue)',
        'ink-blue-light': 'var(--color-ink-blue-light)',
        'status-good': 'var(--color-good)',
        'status-good-bg': 'var(--color-good-bg)',
        'status-neutral': 'var(--color-neutral)',
        'status-neutral-bg': 'var(--color-neutral-bg)',
        'status-bad': 'var(--color-bad)',
        'status-bad-bg': 'var(--color-bad-bg)',
        'financial-blue': 'var(--color-financial-blue)',
        'market-cyan': 'var(--color-market-cyan)',
        'yield-teal': 'var(--color-yield-teal)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-emphasis': 'var(--color-border-emphasis)',
        'divider': 'var(--color-divider)',
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'emphasis': 'var(--shadow-emphasis)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
