/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3D0B37', // Violet Aubergine
        accent: '#F5F5DC',  // Beige Lin
        background: '#F5F5DC', // Beige Lin (Fond)
        dark: '#3D0B37',    // Violet Aubergine (Sombre)
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(to top, #0D0D12 0%, rgba(13, 13, 18, 0.4) 100%)',
      }
    },
  },
  plugins: [],
}
