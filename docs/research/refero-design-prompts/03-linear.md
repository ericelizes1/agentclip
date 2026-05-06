# Linear — Style Reference

> Midnight Command Center: A dark, layered interface lit by precise accents, like a high-tech control panel.

**Theme:** dark
**Source:** https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1
**Live:** https://linear.app

## Description

Linear presents a sophisticated and focused dark-mode experience, reminiscent of a command center dashboard. A deep charcoal base creates a serious, immersive canvas, while subtle gradients and layered surfaces build depth without harsh contrasts. Distinctive muted text colors (`#8a8f98` for secondary, `#62666d` for tertiary) maintain readability against the dark backdrop. Critically, interaction is marked by a single vivid lime green (`#e4f222`), applied selectively to primary calls to action, preventing visual clutter and guiding the user's eye with precision.

## Colors

**Brand**
- **Neon Lime** `#e4f222` — primary action indicators ONLY (filled, single use)

**Accent (decorative only)**
- Aether Blue `#5e6ad2` — decorative highlights, occasional bg
- Cyan Spark `#02b8cc` — informational highlights
- Deep Violet `#6366f1` / Amethyst `#8b5cf6` — bg accents in content blocks

**Neutral / Surfaces (LAYERED)**
- Pitch Black `#08090a` — page bg (L0)
- Graphite `#0f1011` — primary card surface (L1)
- Deep Slate `#161718` — elevated cards (L2)
- Charcoal Grey `#23252a` — borders, overlays (L3)
- Muted Ash `#323334` — subtle dividers
- Gunmetal `#383b3f` — input bg, tertiary

**Text on dark**
- Porcelain `#f7f8f8` — primary text
- Light Steel `#d0d6e0` — secondary
- Storm Cloud `#8a8f98` — tertiary, descriptive labels (recedes)
- Fog Grey `#62666d` — metadata, timestamps

## Typography (TWO FONTS ONLY)

**Inter Variable** — primary UI face for everything
- Weights: 300, 400, **510**, **590** (note custom weights — variable axis)
- Sizes: 10, 11, 12, 13, 14, 15, 16, 17, 20, 24, 32, 48, 64, 72px (14 distinct values)
- **Letter spacing: -0.22 (display) → -0.10 (body)** — tight throughout
- OpenType: `"cv01", "ss03"`

**Berkeley Mono** — code only
- Weight: 400
- Sizes: 12, 13, 14px

### Type Scale (Minor Third 1.2 from 16px base)

| Role | Size | Line Height | Tracking |
|------|------|-------------|----------|
| caption | 10px | 1.4 | -0.10px |
| body | 14px | 1.4 | -0.13px |
| heading | 24px | 1.33 | -0.22px |
| heading-lg | 48px | 1.2 | -0.22px |
| display | 72px | 1.0 | -0.22px |

## Spacing & Shape

- **Density: COMPACT**
- **Base unit:** 4px
- **Section gap:** 24px (TIGHT — much smaller than Resend's 80–120px)
- **Card padding:** 12px (also tight)
- **Element gap:** 8px

**Border Radius:**
- tags: 2px
- badges: 4px
- buttons: 6px
- cards: 6px
- inputs: 6px
- pill: 9999px

## Components

- **Primary CTA:** filled `#e4f222` bg, `#08090a` text, 6px radius
- **Default Card:** `#0f1011` bg, 6px radius, `rgba(0,0,0,0.4) 0 2px 4px` shadow, 8px padding
- **Elevated Card:** `#161718` bg, 12px top radius (0 bottom), inset 1px `#23252a` shadow, 24px/0 padding
- **Nested Card:** `#08090a` bg, 12px radius, no shadow
- **Input:** transparent bg, `#23252a` border, 6px radius, 12/14px padding
- **Subtle Input (search):** `#383b3f` bg, no border, 0px radius
- **Badge:** `#383b3f` bg, `#8a8f98` text, 4px radius, 0/6px padding
- **Sidebar nav item:** transparent, `#8a8f98` text, 2px radius, no padding

## Do's
- `#08090a` (Pitch Black) primary page bg — establishes dark theme
- `#f7f8f8` (Porcelain) for ALL primary text + important icons
- `#e4f222` (Neon Lime) ONLY for primary interactive elements — singular role
- LAYER surfaces: `#08090a` → `#0f1011` → `#161718` for depth/hierarchy
- Inter Variable with tight letter-spacing (-0.22 display, -0.11 body)
- 6px radius across buttons/cards/inputs (consistency)
- `#8a8f98` for secondary text — recede

## Don'ts
- ❌ NO additional bright/saturated colors beyond Neon Lime for interactive
- ❌ NO harsh white bg or light-themed patterns — system anchored in dark
- ❌ Don't deviate from Inter Variable + Berkeley Mono
- ❌ NO strong/diffuse shadows — elevation via subtle layering + sharp `rgba(0,0,0,0.4) 0 2px 4px`
- ❌ NO broad decorative gradients across large sections
- ❌ NO generic radii — 6px for cards/buttons, 2px for tags (signature softness/precision balance)
- ❌ Avoid large white space — design is COMPACT (8px element gap standard)

## Imagery

- **UI elements + product screenshots dominate** — functionality over decoration
- Images contained in realistic product mockups or embedded app frames
- Abstract graphics minimal — subtle bg textures or data viz
- Icons: filled, minimalist, mono-color (Porcelain or Storm Cloud)
- Density LOW — explanatory/showcase, not decorative

## Layout

- Full-bleed dark bg with content constrained by centered max-width
- Hero: full-bleed Pitch Black + centered prominent headline
- Sections alternate dark narrative / embedded UI examples
- Split layouts (text/UI) common
- Vertical stacks or multi-column grids for features
- Sticky top nav + frequent left sidebar (app-like structures)
- **Compact yet deliberate spacing** — dense but organized info flow

## Key Takeaway for AgentClip

Linear's bones:
- 4-level dark surface stack: `#08090a` → `#0f1011` → `#161718` → `#23252a`
- ONE chromatic accent (Neon Lime) for the only filled CTA on the entire page
- All text in Inter Variable with tight negative tracking
- 6px radius is the heartbeat — buttons, cards, inputs, all 6px
- COMPACT density — 8px element gap, 24px section gap
- No shadows — elevation via surface layering

vs Resend: Linear is COMPACT + variable Inter only; Resend is COMFORTABLE + serif display + 80–120px gaps. Both pure black canvas, both single-accent, both dev-tool.

For AgentClip if going dark Linear-style: vermillion replaces Neon Lime, but used FILLED on the CTA (not outlined like Resend). Tighter type, tighter sections.
