/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        davivienda: {
          DEFAULT: '#ED1C24',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#ED1C24',
          600: '#DC2626',
          700: '#B7131B',
          800: '#991B1B',
          900: '#7F1D1D',
          dark: '#B7131B', // Contraste WCAG AA garantizado >= 4.5:1
          surface: '#FFF5F5',
        },
        daviplata: {
          DEFAULT: '#E20613',
          dark: '#B5050F',
        },
        davipuntos: {
          DEFAULT: '#FFB800',
          dark: '#E0A200',
        },
        seat: {
          available: '#10B981', // Verde esmeralda
          selected: '#ED1C24',  // Rojo Davivienda
          locked: '#F59E0B',    // Amarillo ámbar (bloqueo efímero Redis)
          booked: '#9CA3AF',    // Gris (ocupado PostgreSQL)
          business: '#0F172A',  // Pizarra oscuro Clase Ejecutiva
          businessGold: '#D97706', // Oro DaviPuntos Clase Ejecutiva
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'davivienda': '0 4px 14px 0 rgba(237, 28, 36, 0.25)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 6px 12px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
