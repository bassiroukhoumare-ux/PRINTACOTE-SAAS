export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B1C32', // Violet Aubergine
        accent: '#9B4F73', // Accent (Violet clair)
        background: '#F5F2EB', // Beige Lin
        dark: '#1A1518',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Outfit', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to top, rgba(26, 21, 24, 1), rgba(59, 28, 50, 0.5))',
      }
    },
  },
  plugins: [],
}
