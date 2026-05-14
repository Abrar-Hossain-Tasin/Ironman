// import type { Config } from 'tailwindcss'

// const config: Config = {
//   content: [
//     './app/**/*.{ts,tsx}',
//     './components/**/*.{ts,tsx}',
//     './lib/**/*.{ts,tsx}'
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//         bangla: ['Hind Siliguri', 'Noto Sans Bengali', 'ui-sans-serif', 'system-ui', 'sans-serif']
//       },
//       colors: {
//         ironman: {
//           navy: '#1B2454',
//           'navy-50': '#eef0f8',
//           'navy-100': '#d1d6ec',
//           red: '#D81B2A',
//           'red-50': '#fbeaea',
//           'red-100': '#f5c3c3'
//         }
//       },
//       boxShadow: {
//         soft: '0 18px 45px rgba(27, 36, 84, 0.10)'
//       }
//     }
//   },
//   plugins: []
// }

// export default config

// import type { Config } from 'tailwindcss'

// const config: Config = {
//   content: [
//     './app/**/*.{ts,tsx}',
//     './components/**/*.{ts,tsx}',
//     './lib/**/*.{ts,tsx}'
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         sans: ['Cormorant Garamond', 'ui-serif', 'serif'],
//         display: ['Cormorant Garamond', 'ui-serif', 'serif'],
//         body: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//         bangla: ['Hind Siliguri', 'Noto Sans Bengali', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//         mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
//       },
//       colors: {
//         ironman: {
//           navy: '#1B2454',
//           'navy-50': '#eef0f8',
//           'navy-100': '#d1d6ec',
//           'navy-200': '#a4adda',
//           'navy-dark': '#0f1530',
//           red: '#D81B2A',
//           'red-50': '#fbeaea',
//           'red-100': '#f5c3c3',
//           'red-dark': '#a81220',
//           gold: '#C9A84C',
//           'gold-light': '#e8c96e'
//         }
//       },
//       boxShadow: {
//         soft: '0 18px 45px rgba(27, 36, 84, 0.10)',
//         glow: '0 0 20px rgba(216, 27, 42, 0.5), 0 0 40px rgba(216, 27, 42, 0.25)',
//         'glow-green': '0 0 15px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.3)',
//         'glow-blue': '0 0 15px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3)',
//         'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)',
//         'glow-orange': '0 0 15px rgba(249, 115, 22, 0.6), 0 0 30px rgba(249, 115, 22, 0.3)',
//         'glow-purple': '0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.3)',
//         'glow-gold': '0 0 15px rgba(201, 168, 76, 0.6), 0 0 30px rgba(201, 168, 76, 0.3)',
//         'glow-navy': '0 0 20px rgba(27, 36, 84, 0.4), 0 0 40px rgba(27, 36, 84, 0.2)',
//         glass: '0 8px 32px rgba(27, 36, 84, 0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
//         luxury: '0 25px 60px rgba(27, 36, 84, 0.25), 0 8px 20px rgba(27, 36, 84, 0.10)',
//         card3d: '0 30px 60px rgba(27, 36, 84, 0.3), 0 10px 20px rgba(216, 27, 42, 0.1)'
//       },
//       backgroundImage: {
//         'gradient-navy': 'linear-gradient(135deg, #0f1530 0%, #1B2454 50%, #243070 100%)',
//         'gradient-red': 'linear-gradient(135deg, #a81220 0%, #D81B2A 50%, #e8323f 100%)',
//         'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
//         'gradient-gold': 'linear-gradient(135deg, #8B6914 0%, #C9A84C 40%, #e8c96e 60%, #C9A84C 80%, #8B6914 100%)',
//         'shimmer': 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
//         'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")"
//       },
//       keyframes: {
//         'ken-burns': {
//           '0%': { transform: 'scale(1) translate(0%, 0%)' },
//           '100%': { transform: 'scale(1.15) translate(-2%, -2%)' }
//         },
//         'ken-burns-2': {
//           '0%': { transform: 'scale(1.1) translate(-2%, 0%)' },
//           '100%': { transform: 'scale(1) translate(2%, -2%)' }
//         },
//         'ken-burns-3': {
//           '0%': { transform: 'scale(1.05) translate(0%, -2%)' },
//           '100%': { transform: 'scale(1.15) translate(-3%, 2%)' }
//         },
//         'shimmer-sweep': {
//           '0%': { backgroundPosition: '-200% center' },
//           '100%': { backgroundPosition: '200% center' }
//         },
//         'marquee': {
//           '0%': { transform: 'translateX(0)' },
//           '100%': { transform: 'translateX(-50%)' }
//         },
//         'float': {
//           '0%, 100%': { transform: 'translateY(0px)' },
//           '50%': { transform: 'translateY(-8px)' }
//         },
//         'pulse-ring': {
//           '0%': { transform: 'scale(0.8)', opacity: '1' },
//           '100%': { transform: 'scale(2)', opacity: '0' }
//         },
//         'glow-pulse': {
//           '0%, 100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor' },
//           '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor' }
//         },
//         'border-shimmer': {
//           '0%': { backgroundPosition: '0% 50%' },
//           '50%': { backgroundPosition: '100% 50%' },
//           '100%': { backgroundPosition: '0% 50%' }
//         },
//         'slide-up-fade': {
//           '0%': { opacity: '0', transform: 'translateY(30px)' },
//           '100%': { opacity: '1', transform: 'translateY(0)' }
//         },
//         'fade-in': {
//           '0%': { opacity: '0' },
//           '100%': { opacity: '1' }
//         },
//         'line-grow': {
//           '0%': { width: '0%' },
//           '100%': { width: '100%' }
//         }
//       },
//       animation: {
//         'ken-burns': 'ken-burns 12s ease-in-out infinite alternate',
//         'ken-burns-2': 'ken-burns-2 14s ease-in-out infinite alternate',
//         'ken-burns-3': 'ken-burns-3 16s ease-in-out infinite alternate',
//         'shimmer-sweep': 'shimmer-sweep 2.5s linear infinite',
//         'marquee': 'marquee 30s linear infinite',
//         'float': 'float 4s ease-in-out infinite',
//         'float-delay': 'float 4s ease-in-out 1s infinite',
//         'float-delay-2': 'float 4s ease-in-out 2s infinite',
//         'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
//         'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
//         'slide-up-fade': 'slide-up-fade 0.7s ease-out forwards',
//         'fade-in': 'fade-in 0.5s ease-out forwards'
//       },
//       transitionTimingFunction: {
//         'luxury': 'cubic-bezier(0.16, 1, 0.3, 1)'
//       },
//       backdropBlur: {
//         xs: '2px',
//         glass: '20px'
//       }
//     }
//   },
//   plugins: []
// }

// export default config
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cormorant Garamond', 'ui-serif', 'serif'],
        display: ['Cormorant Garamond', 'ui-serif', 'serif'],
        body: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        bangla: ['Hind Siliguri', 'Noto Sans Bengali', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      colors: {
        ironman: {
          navy: '#1B2454',
          'navy-50': '#eef0f8',
          'navy-100': '#d1d6ec',
          'navy-200': '#a4adda',
          'navy-dark': '#0f1530',
          red: '#D81B2A',
          'red-50': '#fbeaea',
          'red-100': '#f5c3c3',
          'red-dark': '#a81220',
          gold: '#C9A84C',
          'gold-light': '#e8c96e'
        }
      },
      boxShadow: {
        soft: '0 18px 45px rgba(27, 36, 84, 0.10)',
        // Enhanced Glow for the Red Button
        glow: '0 0 20px rgba(216, 27, 42, 0.4), 0 0 40px rgba(216, 27, 42, 0.2)',
        luxury: '0 25px 60px rgba(27, 36, 84, 0.2), 0 8px 20px rgba(27, 36, 84, 0.05)',
        glass: '0 8px 32px rgba(27, 36, 84, 0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
      },
      backgroundImage: {
        // Optimized Shimmer for the glossy sweep
        'shimmer': 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)',
        'gradient-navy': 'linear-gradient(135deg, #0f1530 0%, #1B2454 50%, #243070 100%)',
      },
      keyframes: {
        'shimmer-sweep': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      animation: {
        'shimmer-sweep': 'shimmer-sweep 2.5s linear infinite',
        'float-luxury': 'float 5s ease-in-out infinite',
      },
      backdropBlur: {
        glass: '24px'
      }
    }
  },
  plugins: []
}

export default config
