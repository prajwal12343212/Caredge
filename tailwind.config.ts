import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", // Clean, slightly cool gray/white
        foreground: "#0F172A", // Deep slate
        primary: {
          DEFAULT: "#4F46E5", // Indigo-600
          hover: "#4338CA",   // Indigo-700
          light: "#E0E7FF",   // Indigo-100
        },
        accent: {
          DEFAULT: "#06B6D4", // Cyan-500
          hover: "#0891B2",   // Cyan-600
          light: "#CFFAFE",   // Cyan-100
        },
        card: "rgba(255, 255, 255, 0.85)", // Glassmorphism base
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
        'gradient-glass': 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(79, 70, 229, 0.1)',
        'glow': '0 0 25px rgba(79, 70, 229, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
