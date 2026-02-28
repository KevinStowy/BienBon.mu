/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        green: {
          900: '#1B5E20',
          700: '#2E7D32',
          500: '#4CAF50',
          100: '#E8F5E9',
        },
        orange: {
          600: '#E65100',
          500: '#FF9800',
          100: '#FFF3E0',
        },
        neutral: {
          900: '#1A1A1A',
          600: '#6B7280',
          400: '#9CA3AF',
          200: '#E5E7EB',
          50: '#F7F4EF',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.08)',
        md: '0 2px 8px rgba(0,0,0,0.10)',
        lg: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
