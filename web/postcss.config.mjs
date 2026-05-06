// Tailwind 4 ships its PostCSS plugin as a separate package and is the
// only PostCSS step in the pipeline; no autoprefixer needed (Tailwind 4
// includes its own prefixer).
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
