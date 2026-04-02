/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background colours
        'bg': 'var(--color-bg)',
        'bg-surface': 'var(--color-bg-surface)',
        'bg-elevated': 'var(--color-bg-elevated)',
        
        // Text colours
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-muted': 'var(--color-text-muted)',
        
        // Primary accent (Treasury Red)
        'primary': 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-active': 'var(--color-primary-active)',
        'primary-subtle': 'var(--color-primary-subtle)',
        'primary-muted': 'var(--color-primary-muted)',
        
        // Secondary accent (Ink Blue)
        'secondary': 'var(--color-secondary)',
        'secondary-hover': 'var(--color-secondary-hover)',
        'secondary-subtle': 'var(--color-secondary-subtle)',
        
        // Status colours
        'good': 'var(--color-good)',
        'good-subtle': 'var(--color-good-subtle)',
        'warning': 'var(--color-warning)',
        'warning-subtle': 'var(--color-warning-subtle)',
        'bad': 'var(--color-bad)',
        'bad-subtle': 'var(--color-bad-subtle)',
        'neutral': 'var(--color-neutral)',
        'neutral-subtle': 'var(--color-neutral-subtle)',
        
        // Border colours
        'border-custom': 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-strong': 'var(--color-border-strong)',
        
        // Financial data colours
        'financial': 'var(--color-financial)',
        'financial-hover': 'var(--color-financial-hover)',
        'yield': 'var(--color-yield)',
        'sterling': 'var(--color-sterling)',
        
        // Chart colours
        'chart-1': 'var(--color-chart-1)',
        'chart-2': 'var(--color-chart-2)',
        'chart-3': 'var(--color-chart-3)',
        'chart-4': 'var(--color-chart-4)',
        'chart-5': 'var(--color-chart-5)',
        
        // Focus
        'focus': 'var(--color-focus)',
      },
      fontFamily: {
        'display': ['var(--font-display)', 'Georgia', 'serif'],
        'body': ['var(--font-body)', 'system-ui', 'sans-serif'],
        'mono': ['var(--font-mono)', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': 'var(--text-xs)',
        'sm': 'var(--text-sm)',
        'base': 'var(--text-base)',
        'lg': 'var(--text-lg)',
        'xl': 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
        '4xl': 'var(--text-4xl)',
        '5xl': 'var(--text-5xl)',
      },
      lineHeight: {
        'tight': 'var(--leading-tight)',
        'snug': 'var(--leading-snug)',
        'normal': 'var(--leading-normal)',
        'relaxed': 'var(--leading-relaxed)',
      },
      letterSpacing: {
        'tight': 'var(--tracking-tight)',
        'normal': 'var(--tracking-normal)',
        'wide': 'var(--tracking-wide)',
        'wider': 'var(--tracking-wider)',
        'widest': 'var(--tracking-widest)',
      },
      spacing: {
        '0': 'var(--space-0)',
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)',
      },
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      },
      boxShadow: {
        'none': 'var(--shadow-none)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
