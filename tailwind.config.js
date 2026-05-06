export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E4036',
        accent: '#CC5833',
        background: '#F2F0E9',
        dark: '#1A1A1A',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to top, rgba(26, 26, 26, 1), rgba(46, 64, 54, 0.4))',
      }
    },
  },
  plugins: [],
}
