# Slite — Style Reference ⭐ KEY REFERENCE FOR AGENTCLIP

> Warm parchment editorial desk — a workspace where knowledge feels handwritten, not enterprise-stamped.

**Theme:** light
**Live:** https://slite.com

## Description

Slite's visual language feels like **warm parchment under natural light** — a cream-toned workspace where knowledge feels approachable rather than clinical. The dominant `#f9efe4` background reads as aged paper without feeling retro, grounded by `#3f434a` ink-dark text that gives editorial weight to every line.

**Signature move: typographic contradiction.** A serif-adjacent custom face (Garnett) at 64px display, 'goes to die' crossed out in black while 'thrives' renders in vivid blue cursive script — disruption-by-contrast rather than polish. Feature cards sit on near-white `#fdfdfd` against the warm cream ground, tagged with muted category badges in yellows/greens/pinks that never compete with the overall softness. Pill buttons in near-black (`#2d2f34`) against cream create the sharpest contrast point on every screen.

## Colors

**Brand**
- Blueprint `#2e77e5` — interactive text links, decorative accent (single chromatic voice)
- Electric Sky `#176be5` — SVG illustration accent

**Category Badge Pairs (DO NOT SWAP)**
- Security: bg `#fbf4d8` Buttercup + text `#7f6c1f` Ochre
- Customization: bg `#fae9f4` Blossom + text `#9d4d77` Mauve
- Compliance: text `#547358` Sage on near-white
- Control: text `#446aa7` Dusk Blue on near-white

**Neutrals (the warm parchment system)**
- **Parchment `#f9efe4`** — primary page bg (the defining warm cream)
- Vellum `#fdf9f4` — secondary surface (slightly cooler than Parchment)
- Chalk `#fdfdfd` — highest-surface (cards, modals, UI previews)
- Linen `#f0e4d6` — announcement banner bg, muted input fills
- Silver Mist `#d9dde6` — borders, dividers, card outlines
- Ash `#9da3af` — tertiary text, placeholders
- Slate `#656565` — secondary body, subheadings
- Ink `#3f434a` — primary text across ALL contexts
- Graphite `#2d2f34` — primary FILLED button bg + high-contrast UI

## Typography (TWO CUSTOM FACES + MONO)

**Garnett** — display + heading
- Weights: 400, 500, 700
- Sizes: 12, 14, 16, 19, 24, 32, 36, **64**px
- "Custom grotesque with editorial warmth missing from Inter or DM Sans"
- Substitute: DM Sans or Fraunces

**UniversalSans** — UI + body
- Weights: 400, 600, 700
- Sizes: 10, 11, 12, 14, 16, 24px
- "More warmth than Inter — slightly wider apertures match cream-toned page feel"
- Substitute: Plus Jakarta Sans or Instrument Sans

**Geist Mono** — used SPARINGLY for code
- 12px, weight 400
- Letter-spacing: **0.117em** (deliberate typewriter rhythm)

### Type Scale

| Role | Size | Line Height |
|------|------|-------------|
| caption | 10 | 16 |
| body | 14 | 22 |
| heading-sm | 19 | 28 |
| heading | 32 | 42 |
| heading-lg | 36 | 48 |
| display | 64 | 77 |

## Spacing & Shape

- Base unit: 8px, **density: comfortable**
- Page max-width: 1200px
- Section gap: **80–120px** (very generous breathing room)
- Card padding: 24–40px
- Element gap: 8–16px

**Border Radius (PILL is non-negotiable):**
- tooltips: 8px
- cards: 12px
- modals: 24px
- **buttons-pill: 42–50px (non-negotiable brand geometry)**
- badges: 50px

**Shadow (THE three-layer whisper):**
```
rgba(0,0,0,0.01) 0 4px 12px,
rgba(0,0,0,0.05) 0 2px 6px,
rgba(0,0,0,0.10) 0 1px 3px
```
This whisper-shadow is **the only elevation used.**

## Components

- **Primary Pill Button:** `#2d2f34` bg, `#fdfdfd` text, **42px radius**, 8/16px padding. UniversalSans 600 14px. "Sharpest contrast point on any page"
- **Outlined Pill Button:** transparent, `#2f2f30` text + 1px border, **50px radius**, 8/24px padding
- **Ghost Text Button:** transparent, `#2f2f30` text, no border, 0 radius — pure text with chevron, nav dropdowns only
- **Rounded Tag Button:** `#fdfdfd` bg, 1px `#3f434a` border, **16px radius** (between pill and rectangle), 4/12px padding, UniversalSans 400 12px
- **Feature Card:** `#fdfdfd` bg, 1px `#d9dde6` border, **12px radius**, 24–32px padding, three-layer whisper shadow. Top-right: category badge. Emoji icon + Garnett 500 19px heading + UniversalSans 400 14px body in `#656565`
- **Category Badge:** **50px radius**, 4/12px padding, UniversalSans 600 11px UPPERCASE. Use ONLY the four established color pairs
- **Nav Bar:** `#f9efe4` (matches page ground — no contrast separation), 72px tall, NO border-bottom or shadow

## Do's
- `#f9efe4` Parchment as DEFAULT page bg — never white or cold gray
- 42–50px radius on all primary/secondary CTA buttons — pill is non-negotiable
- Garnett 700 for display (36–64px), 500 for section headings (24–32px) — never UniversalSans for headings
- Category badges with 50px radius + the 4 specific color pairs (Ochre/Buttercup, Mauve/Blossom, Sage on near-white, Dusk Blue on near-white)
- Feature cards at 12px radius + the three-layer whisper shadow — only elevation
- `#2d2f34` filled pill as the SINGLE primary CTA per screen; everything else outlined or ghost
- Restrict Blueprint `#2e77e5` to interactive text links + decorative heading accents — never bg or borders

## Don'ts
- ❌ NEVER use pure white `#ffffff` as page bg — reads cold against the warm typographic palette
- ❌ NEVER introduce saturated color backgrounds for section bands — warm cream is the only bg color, badges carry all color variety
- ❌ Don't use weights below 400 or above 700, don't apply Garnett below 12px
- ❌ Don't add shadows beyond the three-layer formula — heavier shadows break the lightweight elevation philosophy
- ❌ NEVER use rectangular buttons (radius < 12px) for primary actions — all CTAs MUST be pill or near-pill
- ❌ Don't display third-party logos in their brand colors in trust bars — convert all to `#3f434a` for visual unity
- ❌ Don't place category badges in any color combo outside the established four

## Surfaces (4-level)

- **L0 Page Ground:** `#f9efe4` Parchment — the warm cream canvas
- **L1 Card Surface:** `#fdfdfd` Chalk — feature cards, sidebar panels, elevated content
- **L2 Inner Surface:** `#fdf9f4` Vellum — nested containers, alternating sections
- **L3 Overlay:** `#2d2f34` — tooltips, dark popovers

## Imagery

- HYBRID: product UI screenshots + simple line-art illustrations (NOT photography)
- Hero embedded product mockup (faithful app recreation in rounded card at ~70% page width)
- Floating testimonial cards + compliance badge graphics overlap the mockup → layered depth
- Illustration style: minimal line-drawing, single-weight strokes on colored bg tiles (`#eebacb` pink, near-white)
- "Always contained within grid cells, never full-bleed"
- **Logos in trust bar all unified to `#3f434a` — brand colors stripped for calm**
- Icons throughout: outlined, single-weight, monochrome, matching text color
- Image density LOW — text + UI-preview dominant, illustration as spatial punctuation

## Layout

- Max-width ~1200px centered
- **Hero:** full-bleed cream + centered headline stack above large product mockup card
- Below hero: sections alternate cream / near-white WITHOUT hard dividers (color shift alone signals breaks)
- Enterprise feature section: 3-col card grid, 24px gutters, uniform card height
- Trust/social-proof: single-row centered logo lockups
- Product detail: asymmetric 2-col split (text 40%, UI 60%)
- 72px sticky single-row nav, no mega-menu (chevron dropdowns)
- Vertical rhythm: 80–120px between sections (editorial pacing)

## Typographic Signature Moves

Garnett owns ALL display + headings. UniversalSans owns ALL UI + body. **Zero overlap.**

**Hero strikethrough effect:** 'goes to die' crossed out in Garnett 700 64px black, 'thrives' replaces in cursive script in Blueprint blue at same size — editorial contradiction is the most distinctive typographic moment.

OpenType features `ss14, ss15, ss19` active on all faces — include `font-feature-settings` in CSS.

## Key Takeaway for AgentClip ⭐

Slite + Anthropic are the two strongest patterns. Slite's contributions:
- Warm parchment `#f9efe4` (slightly more amber than Anthropic's `#faf9f5`)
- **PILL buttons (42–50px radius)** — Slite's signature shape vs Anthropic's 0px
- Three-layer whisper shadow as the ONLY elevation — gentle, paper-like
- Category badge color pairs (could become AgentClip's "QA / DEMO / WALKTHROUGH / BUG" tags)
- Nav bar matches page bg (no contrast separation) — floats seamlessly
- Single primary CTA per screen, pill-shaped, near-black

**For AgentClip the synthesis is:** Anthropic's editorial typography + asymmetric CTA quirk + Slite's warm parchment + pill button system. Both share: warm cream paper, near-black ink text, single chromatic accent, no shadows beyond whisper, two-font hierarchy with tight tracking.
