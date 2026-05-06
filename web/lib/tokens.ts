/**
 * AgentClip design tokens — locked from docs/mockups/index.html.
 *
 * Single source of truth for the design system. Consumed by:
 * - app/globals.css (via Tailwind 4 @theme blocks; mirror the values
 *   below in CSS custom properties)
 * - Storybook stories (direct import for theme decorators in U5)
 * - Component primitives via cva variants (in U8)
 *
 * See docs/research/refero-design-prompts/06-anthropic.md and
 * 07-slite.md for the Anthropic + Slite synthesis these values come
 * from. The vermillion ramp matches the existing brand mark; the
 * warm ink scale replaces the cool achromatic gray we shipped pre-
 * pivot. Asymmetric primary CTA radius (0 0 8px 8px) is the Anthropic
 * brand quirk; pill ghost (42px) is the Slite signature.
 */

export const tokens = {
  // ------------------------------------------------------------------
  // Brand accent — single chromatic voice across the system.
  // Used for: primary action borders, headline keyword underlines,
  // category highlights. Never as a flat fill except on the inverted
  // dark editorial card.
  // ------------------------------------------------------------------
  vermillion: {
    50: '#fdf0eb',
    100: '#fadcd0',
    300: '#f08a6a',
    500: '#d94824', // base brand mark
    600: '#b73a1a',
    700: '#93281b',
  },

  // ------------------------------------------------------------------
  // Warm ink scale — Anthropic-inspired, replaces cool achromatic gray.
  // Reads as "ink on warm paper" rather than "text on cold spec sheet".
  // ------------------------------------------------------------------
  ink: {
    50: '#faf9f5',
    100: '#f0eee6',
    200: '#e8e6dc',
    300: '#d1cfc5',
    400: '#b0aea5',
    500: '#87867f',
    600: '#5e5d59',
    700: '#3d3d3a',
    800: '#2a2a26',
    900: '#141413', // primary text + dark editorial card bg
  },

  // ------------------------------------------------------------------
  // Surface tokens — alternating thermal layers (Anthropic pattern).
  // L0: page ground / L1: nav + cards / L2: nested cards / dark: inversion.
  // ------------------------------------------------------------------
  paper: '#faf9f5',
  paperRaised: '#f0eee6',
  paperSunken: '#e8e6dc',
  paperOat: '#e3dacc',
  paperDark: '#141413',

  // ------------------------------------------------------------------
  // Radius scale.
  // - radiusPill (42px): Slite signature for ghost / secondary CTAs
  // - radiusCta (asymmetric): Anthropic signature for the primary CTA
  // ------------------------------------------------------------------
  radiusSm: '6px',
  radius: '10px',
  radiusLg: '14px',
  radiusXl: '20px',
  radiusPill: '42px',
  radiusCta: '0px 0px 8px 8px',

  // ------------------------------------------------------------------
  // Whisper shadow — Slite's three-layer formula. The ONLY elevation
  // in the system. No drop shadows beyond this.
  // ------------------------------------------------------------------
  shadowWhisper:
    'rgba(0, 0, 0, 0.01) 0px 4px 12px 0px, ' +
    'rgba(0, 0, 0, 0.05) 0px 2px 6px 0px, ' +
    'rgba(0, 0, 0, 0.10) 0px 1px 3px 0px',

  // ------------------------------------------------------------------
  // Motion easings.
  // ------------------------------------------------------------------
  ease: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.15, 1)',

  // ------------------------------------------------------------------
  // Typography stacks.
  // ------------------------------------------------------------------
  fontSans: 'Geist, ui-sans-serif, system-ui, -apple-system, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const

export type Tokens = typeof tokens
