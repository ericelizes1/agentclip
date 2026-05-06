# Cursor — Style Reference

> Warm ivory software studio.

**Theme:** light
**Source:** https://styles.refero.design/style/4e3b4717-84c8-4599-baaf-a343c3d619b6
**Live:** https://cursor.com

## Description

Cursor's design language evokes a functional, precise studio environment, blending the tactile feel of physical tools with the clean, digital interface of modern software. A foundation of warm, off-white backgrounds (#f7f7f4) and subtle, multi-layered shadows create a sense of depth and hierarchy, mimicking stacked, floating interface elements. Typography is highly refined, utilizing custom mono and gothic fonts with precise letter-spacing and stylistic alternates that convey technical sophistication.

## Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas Parchment | `#f7f7f4` | `--color-canvas-parchment` | Page backgrounds — soft warm foundation |
| Inkwell | `#262510` | `--color-inkwell` | Primary text, strong borders |
| Muted Stone | `#7a7974` | `--color-muted-stone` | Secondary text, subtle borders |
| Deep Shadow | `#141414` | `--color-deep-shadow` | Deepest text — max contrast |
| Pebble Gray | `#e6e5e0` | `--color-pebble-gray` | Hover states, subtle elevation |
| **Onyx Outline** | **`#f54e00`** | `--color-onyx-outline` | **Vibrant orange — outlined buttons + link text** |
| Chartreuse Alert | `#4ade80` | `--color-chartreuse-alert` | Vivid green for positive cues |
| Goldenrod Accent | `#c08532` | `--color-goldenrod-accent` | Build action button bg |
| Forest Green Action | `#34785c` | `--color-forest-green-action` | Secondary "View PR"-style buttons |
| Highlight Beige | `#cdcdc9` | `--color-highlight-beige` | Nested card bg |

## Typography

**CursorGothic** — primary UI text + headlines + nav (substitute: system-ui)
- Weight: 400
- Sizes: 13, 14, 16, 22, 26, 36, 72px
- Letter spacing: -0.45 (display), -0.35 (heading), -0.19, -0.08, +0.08, +0.18
- OpenType: `"ss09", "ss08", "tnum"`

**berkeleyMono** — code, input text, small body
- Weights: 400, 500
- Sizes: 12, 13px

**Lato** — secondary/utility (buttons, links)
- Weights: 400, 600
- Sizes: 10, 12, 14, 16px

**EB Garamond** — present but not described
- Weights: 400, 500
- Sizes: 16px

### Type Scale (Minor Third 1.2 from 15px base)

| Role | Size | Line Height | Letter Spacing |
|------|------|-------------|----------------|
| caption | 10px | 1.1 | 0.06px |
| body-lg | 14px | 1.43 | 0.08px |
| heading-sm | 22px | 1.25 | -0.08px |
| heading | 26px | 1.2 | -0.35px |
| heading-lg | 36px | 1.1 | -0.45px |
| display | 72px | 1.0 | -2.16px |

## Spacing & Shape

**Density:** compact
**Page max-width:** 1300px
**Section gap:** 43px
**Card padding:** 12px
**Element gap:** 8px

**Border radius:** cards 4px, buttons 4px, general 4px, prominent 8px

**Shadows:**
- xl: `rgba(0,0,0,0.14) 0 28px 70px 0, rgba(0,0,0,0.1) 0 14px 32px 0, oklab(0.263 -0.002 0.012 / 0.1) 0 0 0 1px`
- subtle: `oklab(0.263 -0.002 0.012 / 0.1) 0 0 0 1px, rgba(0,0,0,0.28) 0 18px 36px -18px`

## Components

- **Primary Filled Button:** Inkwell bg, Canvas Parchment text, 4px radius, 17.5px padding all sides
- **Outlined Accent Button:** transparent bg, Onyx Outline text + 1px border, 4px radius, 17.5px padding
- **Ghost Action Button:** transparent bg, Inkwell text, 4px radius, 2px/6px padding
- **Elevated Content Card:** Pebble Gray bg, 10px radius, multi-layered shadow
- **Flat Background Card:** Canvas Parchment bg, 4px radius, no shadow, 0/7.5px padding
- **Text Input Field:** transparent bg, Muted Stone border, 0px radius, 8px/6-8px padding
- **Icon Button:** transparent bg, Muted Stone border + text, 0px radius

## Do's
- Use CursorGothic for all headings + primary UI
- Apply precise letter-spacing values (-0.45 at 72px, -0.08 at 22px)
- Elevate content with the multi-layered shadow token (don't invent custom shadows)
- Apply Canvas Parchment (#f7f7f4) as PRIMARY background for major sections
- Reserve Onyx Outline (#f54e00) for outlined interactive elements ONLY — NEVER fill
- 4px radius for general elements, 8px for prominent
- 8px element gap between related UI

## Don'ts
- ❌ NO solid bg colors for primary CTAs — prefer bordered actions with Onyx Outline
- ❌ NO arbitrary shadow values — only the defined multi-layered token
- ❌ NEVER use achromatic grays for text/borders — always Inkwell or Muted Stone
- ❌ NO new font families beyond CursorGothic + Lato + berkeleyMono
- ❌ NEVER use Onyx Outline as a background fill
- ❌ NO large uncontained background images — visuals belong in components

## Layout Pattern

- max-width 1300px (contained, spacious)
- **Hero is split layout** — prominent headline next to contextual product screenshot
- Content alternates left-text/right-image blocks
- **Product screenshots OFTEN OVERLAP** — stacked, multi-windowed feel
- Generous vertical spacing between sections (unhurried rhythm)
- Simple top nav: links + primary download button

## Imagery

- **Driven by product screenshots and UI examples**
- Contained within card-like structures, often floating with subtle shadows
- Overlapping screenshots = dynamic multi-windowed feel
- The product screenshots themselves use a DARK UI with syntax highlighting — high contrast against light page
- **Minimal photography** — focus is on UI and code
- Icons: simple, monochrome, Muted Stone fills (utility over embellishment)
- Density balanced — imagery illustrates, doesn't dominate

## Surfaces (Elevation Levels)

- **L0:** Canvas Parchment `#f7f7f4` — base page bg
- **L1:** Pebble Gray `#e6e5e0` — elevated cards, hover states
- **L2:** Highlight Beige `#cdcdc9` — nested elements

## Key Takeaway for AgentClip

Cursor's bones:
- Warm off-white bg (#f7f7f4) — NOT cool gray-white
- Vermillion-adjacent orange (#f54e00) used ONLY for outlined links/buttons, never as fill
- Inkwell (#262510) primary text — NOT pure black, slightly warm
- Multi-layered shadows for elevation (not flat 1px borders)
- Compact density (8px element gap)
- 4px radius standard, 8px for prominent
- Hero = split layout with overlapping product screenshots stacked at angles
- Imagery = dark-UI screenshots floating in light surrounding page
