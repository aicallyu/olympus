/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-950) / <alpha-value>)',
        surface: 'rgb(var(--surface-800) / <alpha-value>)',
        'surface-alt': 'rgb(var(--surface-900) / <alpha-value>)',
        'surface-hover': 'rgb(var(--surface-750) / <alpha-value>)',
        border: 'rgb(var(--border) / 0.06)',
        'border-soft': 'rgb(var(--border-soft) / 0.04)',

        primary: 'rgb(var(--gold-400) / <alpha-value>)',
        'primary-hover': 'rgb(var(--gold-300) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',

        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Cinzel"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Cinzel"', 'serif'],
      },
    },
  },
  plugins: [],
}
