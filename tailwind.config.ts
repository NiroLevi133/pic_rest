import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  // `dark:` variants follow the resolved theme: data-theme="dark", or the OS when no theme is chosen.
  darkMode: ['variant', ['&:is([data-theme="dark"] *)', '@media (prefers-color-scheme: dark) { &:not([data-theme="light"] *) }']],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3f2',
          100: '#fee4e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
