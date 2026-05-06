# Anthropic — Style Reference ⭐ KEY REFERENCE FOR AGENTCLIP

> Research journal printed on warm stone — authoritative typographic composition where word-level underlines replace color as the primary emphasis mechanism, and the only warmth comes from the paper itself.

**Theme:** light
**Live:** https://anthropic.com

## Description

Anthropic's site runs on **warm ivory parchment (`#faf9f5`)** — not white, not gray, but the color of aged paper under good light. The palette is almost ENTIRELY ACHROMATIC, with the entire chromatic budget spent on a single earthy terracotta accent (`#d97757`) held in reserve. Two custom type families do all the personality work:
- **Anthropic Sans** drives navigation and UI at tight tracking
- **Anthropic Serif** delivers editorial weight in headlines and featured content
The serif-plus-grotesque pairing signals **research institution, not startup**.

**The signature move:** headlines use a thick UNDERLINE on key words (visible on 'research' and 'products') as the SOLE decorative device — it replaces color as the emphasis mechanism. Massive feature cards flip to near-black `#141413` background, creating hard-edged ALTERNATING surface bands with zero gradient or shadow softening.

## Colors

**The signature: zero chromatic by default, single Clay accent in reserve**

**Accent**
- **Clay** `#d97757` — accent CTA, terracotta held in reserve for intentional warmth
- Accent Ember `#c6613f` — hover/pressed
- Olive `#788c5d` / Sky `#6a9bcc` / Fig `#c46686` / Cactus `#bcd1ca` — categorical tag color VARIANTS, never combinable

**Neutrals (warm ivory + slate)**
- Slate Dark `#141413` — primary text + dark card bg (functions as both fg AND bg)
- Slate Medium `#3d3d3a` — mid-dark borders, focus rings
- Slate Light `#5e5d59` — tertiary text, captions
- Cloud Dark `#87867f` — secondary text, meta
- Cloud Medium `#b0aea5` — disabled borders
- Cloud Light `#d1cfc5` — hairline borders
- Oat `#e3dacc` — tertiary surface
- Ivory Dark `#e8e6dc` — text on dark, dividers
- Ivory Medium `#f0eee6` — nav bg, secondary surface
- **Ivory Light `#faf9f5`** — page background (the parchment character)

## Typography (TWO CUSTOM FACES + MONO)

**Anthropic Sans** — ALL UI chrome
- Weights: 400, 500, 600, **700** (hero)
- Sizes: 12, 15, 16, 24, **61**px
- Letter spacing: **-0.02em at 61px display**, -0.005em at 24px, -0.002em at body
- Substitute: Inter, DM Sans
- "61px with -0.02em reads as architectural lettering, not typical web type"

**Anthropic Serif** — feature card headlines, editorial hero, project titles
- Weights: 400, 600
- Sizes: 18, 20, 24, **91px**
- "At 91px against near-black it reads as a printed broadsheet masthead"
- Substitute: Playfair Display, Lora

**Anthropic Mono** — technical labels, metadata fields, category tags ONLY
- 16px, weight 400
- "Its presence signals 'data' or 'classification' within typographic layouts"
- Substitute: JetBrains Mono, IBM Plex Mono

### Type Scale (Major Third 1.25 from 12px)

| Role | Size | Line Height | Letter Spacing |
|------|------|-------------|----------------|
| caption | 12 | 1.3 | — |
| body-sm | 15 | 1.4 | -0.03 |
| subheading | 18 | 1.4 | — |
| heading-sm | 20 | 1.4 | — |
| heading | 24 | 1.3 | -0.12 |
| heading-lg | 61 | 1.1 | -1.22 |
| display | 91 | 1.1 | — |

## Spacing & Shape

- Base unit: 4px, **density: COMPACT**
- Page max-width: 1200px
- Section gap: 61px (compact)
- Card padding: 31px
- Element gap: 8–16px

**Border Radius (the asymmetric signature):**
- buttons: **0px** (deliberate formal signal)
- badges: 0px
- cards: 8px
- panels: 16px
- featuredCards: 24px
- **Try Claude CTA: `0px 0px 8px 8px` (asymmetric — flat top, rounded bottom only)** 🔥

## Components

- **Primary Nav Button (Try Claude):** `#faf9f5` bg, `#141413` text + 1px border, **`borderRadius: 0px 0px 8px 8px`** (asymmetric!), 12/31px padding, Sans 500 15px
- **Ghost Nav Button:** transparent, 1px solid `#141413` border, 0px radius, 22/12px padding
- **Inline Underline-Emphasis Link:** Sans 700 61px, text-decoration underline ONLY (no color change) — the keyword emphasis system
- **Feature Card (Dark):** `#141413` bg, **24px radius**, 31px padding. Anthropic Serif 91px weight 400 in `#faf9f5` headline + right-aligned 3D imagery
- **Release Card (Light):** `#f0eee6` or `#e3dacc` bg, 8px radius, 31px padding. Sans 600 20px heading + Sans 400 15px body + Mono 16px metadata in footer
- **Metadata Badge:** transparent bg, `#141413` text, 0px radius, NO padding — pure typographic with no chip/pill/capsule

## Do's
- `#faf9f5` (Ivory Light) page base — NEVER pure white or neutral gray
- Buttons at **0px radius** EXCEPT the primary 'Try Claude' which uses asymmetric `0px 0px 8px 8px`
- Emphasize headline keywords with thick **text-decoration underline ONLY** — never color, weight increase, or highlight bg
- Anthropic Serif at display sizes (91px, weight 400) ONLY within dark `#141413` cards; Sans for all light-surface headlines
- Restrict chromatic to accent palette, deploy SPARINGLY — one accent per section max, default uses ZERO chromatic
- Dark editorial feature cards at 24px radius, full content-column width, hard imagery clipping at same radius
- Anthropic Mono 16px for metadata labels (DATE, CATEGORY) in card footers

## Don'ts
- ❌ NEVER use pure white `#ffffff` or pure black `#000000` as a surface bg — all surfaces from ivory/slate range
- ❌ NEVER add box-shadows or drop-shadows to ANY component — surface contrast + border lines are the only depth signals
- ❌ NEVER round button corners uniformly — 0px is a deliberate formal signal; avoid 4/6/pill
- ❌ NEVER use Anthropic Serif on the page's ivory background at large sizes — display serif is RESERVED for the dark card inversion
- ❌ NEVER apply multiple chromatic accents in a single section — palette tokens are categorical variants, NOT combinable
- ❌ NEVER use background fills for badges/labels — metadata = pure text, no chip/pill/capsule
- ❌ NEVER replace underline emphasis with color emphasis on headlines

## Surfaces (4-level alternation)

- **L1 Page Base:** `#faf9f5` — root + button fills + default surface
- **L2 Nav/Elevated:** `#f0eee6` — nav bg + secondary cards
- **L3 Oat Card:** `#e3dacc` — tertiary cards, callouts
- **L4 Feature Dark:** `#141413` — editorial feature cards (max contrast against base)

## Elevation

**Zero box-shadows throughout.** Surface depth = bg color contrast (ivory vs near-black vs oat) with hard-edged transitions, no blurring. Cards sit FLUSH in their grid with no lift. **"Print design transferred to screen: depth through ink density, not light simulation."**

## Imagery

- Single recurring 3D abstract graphic: dark mesh/lattice of hexagonal/irregular cells with glowing white edges (biological cell or neural network under microscope)
- Rendered as high-contrast dark-field image (near-black bg, luminous white wireframe)
- Always contained within dark card boundary, hard-edged radius clipping (24px)
- "Not photography or illustration — 3D scientific visualization with biological aesthetic, suggesting AI safety as material science"
- Rest of page: ENTIRELY text-dominant, no decorative imagery, icons, or illustration

## Layout

- Max-width 1200px centered on ivory
- **Hero:** split-column — large weight-700 headline left (~55%), brief paragraph right (~30%), generous ~80px top padding
- Below hero: full-width DARK CARDS (24px radius) break the ivory field — left half: serif display headline + CTA, right half: 3D viz image
- Cards full-column-width but NOT full-bleed to viewport
- 3-col card grid for "Latest releases" on oat/ivory-dark backgrounds
- **Strict alternating thermal pattern**: hero → dark editorial band → light card grid → repeat
- Section gaps ~61px
- No sidebar, no mega-menu — inline dropdown chevrons in nav

## Typographic Emphasis System

**Underline as the primary (and only) visual emphasis device.** Hero key nouns get a thick text-decoration underline — replaces conventional accent-color or bold-weight emphasis. The near-zero chromatic palette MAKES this necessary: with no color to draw the eye, typographic decoration carries all the semantic weight. Apply consistently: underline keywords in display-scale headlines, NEVER change color or weight. Body text uses NO emphasis decorations.

## Surface Alternation System

Page rhythm: STRICT light/dark alternation. Ivory page → dark editorial cards (24px radius, contained inversion, NOT full-bleed band) → light card grids → repeat. Hard-edged transitions, no gradient fade. Dark cards full content-column-width but not viewport-bleed — ivory peeks around all four corners of the dark card, maintaining the sense that **dark is a surface element, not a background takeover.**

## Key Takeaway for AgentClip ⭐

This is the closest reference to AgentClip's existing DNA:
- Warm ivory `#faf9f5` instead of cool gray-white (matches Eric's editorial voice)
- Single Clay terracotta accent `#d97757` — OPTIONAL, can swap to AgentClip's vermillion `#d94824`
- **Underline keywords for emphasis** — perfect for "Your agent can ▸ send you demos" or "FILED BY Eric Elizes"
- Sans + Serif + Mono three-voice hierarchy → **Anthropic Sans = Geist Sans, Anthropic Serif = pick something (Fraunces, EB Garamond), Anthropic Mono = Geist Mono**
- Dark card inversion (24px radius) for "editorial breaks" within ivory page — could be where the GALLERY lives, with serif display titles on each clip card
- 0px button radius EXCEPT one signature asymmetric CTA — could become AgentClip's brand quirk
- Mono labels (DATE, CATEGORY) for metadata = perfect for "FIELD RUN", "FILED BY", "CLIP 1 OF 4"
- ZERO box-shadows — depth via surface contrast only

**This is probably THE direction for AgentClip.**
