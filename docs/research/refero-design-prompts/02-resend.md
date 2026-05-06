# Resend — Style Reference

> Obsidian developer terminal — every surface reads like polished black glass under a focused beam of white type.

**Theme:** dark
**Source:** https://styles.refero.design/style/0d914ef0-fa84-4c60-a9aa-cef0b5eb6e5d
**Live:** https://resend.com

## Description

Resend is a pure black command surface — the canvas is `#000000` with near-zero colorfulness (1%), giving the entire interface the weight of polished obsidian. Headlines use a custom serif (Domaine) at display sizes with tight `-0.01em` tracking, while UI copy runs in Inter and monospaced code elements appear in CommitMono, creating a three-voice typographic hierarchy that signals dev tooling without decoration. Color appears almost exclusively as functional data punctuation: violet for code identity, blue for interactive borders, and a handful of vivid status colors (green, red, yellow, light blue) that function as email event indicators — never as decoration. The system uses subtle border-based elevation (1px hairlines at `#292d30`) rather than shadows, keeping all surfaces flush and matte on black.

## Colors

**Brand**
- **Electric Blue** `#3b9eff` — outlined CTA borders, focused conversion moments
- **Resend Violet** gradient `linear-gradient(in oklab, #9281f7, #9a54dc)` — code highlights, brand mark

**Status (only inside product UI, never decorative)**
- Delivered Green `#3ad389`
- Bounced Red `#ff9592`
- Complained Yellow `#ffca16`
- Opened Blue `#70b8ff`
- Clicked Lavender `#baa7ff`

**Neutrals**
- Void Black `#000000` — page canvas + card backgrounds
- Surface Lift `linear-gradient(#1b1b1b, #030303)` — barely-perceptible card top
- Graphite Rail `#292d30` — borders, dividers, frames (1px hairline)
- Smoke `#464a4d` — secondary borders
- Ash `#6c6c6c` — tertiary text
- Steel `#6e727a` — secondary body text
- Fog `#a1a4a5` — primary muted body, icon fills
- Mist `#abafb4` — slightly brighter UI
- Frost `#f0f0f0` — primary content text (single high-contrast on black)
- Pure White `#ffffff` — max-emphasis text + active labels

## Typography (THREE-VOICE HIERARCHY)

**Inter** — all UI chrome (nav, buttons, body, captions, links). The workhorse.
- Weights: 400, 500, 600
- Sizes: 12, 14, 16, 18, 24px

**Domaine** (serif) — display-only for biggest hero statements
- Weight: 400 (anti-convention — most dev tools use grotesque sans here)
- Sizes: 77, 96px
- Letter spacing: `-0.01em` (tightest in system)
- Substitute: DM Serif Display, Playfair Display
- Authority through editorial restraint

**ABCFavorit** (geometric grotesque) — section headings + subheadings
- Weights: 400, 500
- Sizes: 14, 16, 20, 56px
- Letter spacing: `-0.05em` at 56px; `+0.025em` at smaller sizes
- Substitute: Söhne, GT America

**CommitMono** — code, filenames, CLI snippets
- Substitute: JetBrains Mono, Fira Code

### Type Scale (Major Third 1.25 from 12px base)

| Role | Size | Line Height | Tracking |
|------|------|-------------|----------|
| caption | 12 | 1.33 | — |
| body-sm | 14 | 1.43 | — |
| body | 16 | 1.5 | — |
| subheading | 18 | 1.6 | — |
| heading-sm | 20 | 1.3 | — |
| heading | 24 | 1.33 | — |
| heading-lg | 56 | 1.0 | -2.8px |
| display | 96 | 1.0 | -0.96px |

## Spacing & Shape

- **Density:** comfortable
- **Base unit:** 4px
- **Page max-width:** 1200px
- **Section gap:** 80–120px (LARGE rhythm)
- **Card padding:** 32px
- **Element gap:** 16px

**Border Radius:**
- buttons: 6px
- badges: 6px
- tags: 10px
- cards: 16px
- modals: 16px
- large: 24px

**Elevation = 1px BORDER ONLY (no shadows on cards):**
- Icon ring: `rgba(176,199,217,0.145) 0 0 0 1px`
- Dropdown: `rgba(0,0,0,0.1) 0 1px 3px, rgba(0,0,0,0.1) 0 1px 2px -1px`
- Focus ring: `#000 0 0 0 8px`

## Components

- **Primary CTA:** transparent bg, 1px solid `#3b9eff` border, 6–8px radius, `#fff` Inter 500 14px
- **Ghost Nav Button:** transparent, no border, `#f0f0f0 71%` opacity, Inter 400 14px, 0 radius
- **Announcement Pill:** transparent bg, 1px `#292d30` border, 16px radius, Inter 400 14px
- **Feature Card:** `#000` (or near-black gradient), 1px `#292d30` border, 16px radius, 32px padding, NO shadow
- **Code Snippet:** near-black + 1px `#292d30` border, 16px radius. CommitMono 14px. Keywords/identifiers in `#9281f7`
- **Nav Bar:** `#000` + `backdrop-filter: blur(25px)` (frosted glass on scroll), 59px tall, 1px `#292d30` bottom

## Do's
- `#000000` as default bg for EVERY section, card, container — deviations require visible 1px `#292d30` elevation
- Domaine 400 ONLY for hero display (77–96px); ABCFavorit ONLY for section headings (56px) — never swap
- Reserve six vivid status colors STRICTLY for product-UI data — never decorative
- CommitMono ONLY for code/CLI/dev tokens
- 6px radius for buttons, 16px for pill badges (separate CTA shape from tag shape)
- `#3b9eff` is the ONLY chromatic color in the nav/shell — always outlined CTA only
- Card padding always 32px, only border treatment is 1px solid `#292d30`

## Don'ts
- ❌ NO filled colored bg for action buttons — outlined or ghost only
- ❌ NEVER apply Domaine/ABCFavorit to UI chrome (nav, badges, button copy)
- ❌ NEVER use more than ONE vivid status color in non-product context
- ❌ NEVER add drop shadows to cards — elevation = 1px border on black
- ❌ NEVER use a white/light bg for full-width sections — even "light" content stays near-black
- ❌ NEVER increase letter-spacing on display text — Domaine + ABCFavorit run negative tracking
- ❌ NEVER mix more than two typefaces in a single component

## Imagery

- **High-fidelity 3D-rendered objects** with PBR lighting (the iconic floating cube)
- Lacquered, ceramic-finish look — deep black with subtle specular highlights
- Single directional light, no floor shadow
- NO lifestyle photography, NO people, NO abstract patterns
- Product screenshots = contained UI panels in dark card frames (flat, not floating)
- Icon style: outlined ~1.5px stroke, monochromatic white/gray
- Image density LOW: one hero 3D object, 1–2 product video panels per section
- Site is text/code dominant; imagery is punctuation

## Layout

- max-width ~1200px centered, full-bleed black canvas
- **Hero:** left-aligned headline + announcement pill above + two action buttons + right-positioned 3D rendered object floating in dark field
- Section rhythm: SEAMLESS black-on-black with hairline 1px `#292d30` dividers — no alternating sections
- Feature sections: left-text / right-product-video, ~40/60 split, alternating sides
- Social proof: horizontal scroll card strip
- Code showcases: centered stack with code panel as hero visual
- Footer: minimal (two links)
- Generous spacing (80–120px section gaps)
- Very low content density per viewport — focus on each product moment

## Motion

- **0.15s** for hover transitions (color, border, bg) via `ease`
- **0.2s** for component entrances (opacity + transform)
- Named animations: hero-text-slide-up-fade, header-slide-down-fade, open-scale-up-fade
- ALWAYS `ease`, never `ease-in-out` (snappier feel, no "sticky" sensation)

## Key Takeaway for AgentClip

Resend's bones:
- Pure `#000000` canvas — uncompromising
- Three-voice type: serif display (Domaine 400) + grotesque sans body (Inter) + mono code (CommitMono)
- Single chromatic accent (`#3b9eff` electric blue) used ONLY as outlined CTA border
- Elevation via 1px hairline, NEVER shadow
- 3D rendered hero object as the ONE photographic moment
- Status colors are functional data only — never decorative
- Generous 80–120px section gaps create breathing rhythm

If AgentClip went dark dev-tool: this is the template. Vermillion replaces electric blue. Editorial vocabulary stays. Hero would have a single floating 3D object (clip stack? ticket?) in the dark field.
