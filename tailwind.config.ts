
import type {Config} from 'tailwindcss';

const { fontFamily } = require("tailwindcss/defaultTheme")

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        brand: {
          yellow: 'hsl(var(--brand-yellow))',
          orange: 'hsl(var(--brand-orange))',
          red: 'hsl(var(--brand-red))',
          black: 'hsl(var(--brand-black))',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'light-streaks': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        'gradient-pan': {
            '0%': { 'background-position': '0% 50%' },
            '50%': { 'background-position': '100% 50%' },
            '100%': { 'background-position': '0% 50%' },
        },
        'neon-pulse': {
            '0%, 100%': { 'box-shadow': '0 0 5px hsl(var(--brand-yellow)), 0 0 10px hsl(var(--brand-yellow)), 0 0 20px hsl(var(--brand-orange))', color: 'hsl(var(--brand-yellow))' },
            '50%': { 'box-shadow': '0 0 10px hsl(var(--brand-orange)), 0 0 20px hsl(var(--brand-red)), 0 0 30px hsl(var(--brand-red))', color: 'hsl(var(--brand-orange))' },
        },
         'neon-pulse-arrows': {
            '0%, 100%': { 'box-shadow': '0 0 3px hsl(var(--brand-yellow)), 0 0 5px hsl(var(--brand-yellow))', 'border-color': 'hsl(var(--brand-yellow))' },
            '50%': { 'box-shadow': '0 0 5px hsl(var(--brand-orange)), 0 0 10px hsl(var(--brand-orange))', 'border-color': 'hsl(var(--brand-orange))' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'light-streaks': 'light-streaks 8s linear infinite',
        'gradient-pan': 'gradient-pan 15s ease infinite',
        'neon-pulse': 'neon-pulse 4s infinite',
        'neon-pulse-arrows': 'neon-pulse-arrows 2s infinite',
      },
       backgroundImage: {
        'gradient-brand': 'linear-gradient(to right, hsl(var(--brand-yellow)), hsl(var(--brand-orange)), hsl(var(--brand-red)))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
