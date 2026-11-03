import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tet: {
          red: '#c51d24',
          'red-dark': '#8b0f15',
          gold: '#f59e0b',
          'gold-light': '#fbbf24',
          'gold-dark': '#b45309',
          amber: '#d97706',
          bg: '#1a0808',
          card: '#2a1111',
          silk: '#fef3c7',
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '10%': { transform: 'translate(-6px, -4px) rotate(-3deg)' },
          '20%': { transform: 'translate(6px, 4px) rotate(3deg)' },
          '30%': { transform: 'translate(-8px, 2px) rotate(-4deg)' },
          '40%': { transform: 'translate(8px, -2px) rotate(4deg)' },
          '50%': { transform: 'translate(-4px, 6px) rotate(-2deg)' },
          '60%': { transform: 'translate(6px, -6px) rotate(2deg)' },
          '70%': { transform: 'translate(-6px, -2px) rotate(-3deg)' },
          '80%': { transform: 'translate(6px, 2px) rotate(3deg)' },
          '90%': { transform: 'translate(-2px, -4px) rotate(-1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shake: 'shake 0.35s infinite ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
