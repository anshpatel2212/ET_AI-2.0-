import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050B1A',
          secondary: '#0A1428',
          tertiary: '#0F1F3D',
        },
        neon: {
          primary: '#00F5A0',
          secondary: '#00D4FF',
          tertiary: '#7B61FF',
          warning: '#FFB800',
          danger: '#FF3D71',
        },
        text: {
          primary: '#E6F1FF',
          secondary: '#8892B0',
        },
        aqi: {
          good: '#00E400',
          moderate: '#FFFF00',
          unhealthy_sensitive: '#FF7E00',
          unhealthy: '#FF0000',
          very_unhealthy: '#8F3F97',
          hazardous: '#7E0023',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(15,31,61,0.45), rgba(10,20,40,0.35))',
        'neon-glow': 'radial-gradient(ellipse at center, rgba(0,245,160,0.15), transparent 70%)',
        'neon-glow-cyan': 'radial-gradient(ellipse at center, rgba(0,212,255,0.15), transparent 70%)',
        'neon-glow-purple': 'radial-gradient(ellipse at center, rgba(123,97,255,0.15), transparent 70%)',
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0,245,160,0.3)',
        'neon-md': '0 0 20px rgba(0,245,160,0.4)',
        'neon-lg': '0 0 40px rgba(0,245,160,0.5)',
        'neon-cyan': '0 0 20px rgba(0,212,255,0.4)',
        'neon-purple': '0 0 20px rgba(123,97,255,0.4)',
        'neon-warning': '0 0 20px rgba(255,184,0,0.4)',
        'neon-danger': '0 0 20px rgba(255,61,113,0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'grid-scroll': 'grid-scroll 20s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'data-stream': 'data-stream 3s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0,245,160,0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(0,245,160,0.6)' },
        },
        'neon-flicker': {
          '0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100%': { opacity: '1' },
          '20%, 21.999%, 63%, 63.999%, 65%, 69.999%': { opacity: '0.4' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'grid-scroll': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'data-stream': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
      },
      backgroundSize: {
        '200%': '200% 100%',
      },
    },
  },
  plugins: [],
}
export default config
