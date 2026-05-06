# Mercury — Style Reference

> Mountain Top Command Center

**Theme:** dark
**Source:** https://styles.refero.design/style/3172cd4d-118a-4a16-a259-6b634d32322e
**Live:** https://mercury.com

## Description

The design feels like a command center at twilight, expansive and focused. A deep, near-black neutral palette (`#1e1e2a`, `#171721`) creates an immersive, cinematic canvas where glowing off-white text (`#ededf3`) provides crisp clarity. All energy is channeled into a single, vibrant violet-blue accent (`#5266eb`) reserved strictly for primary calls-to-action, like indicator lights on a high-tech console. The typography is a defining feature, with custom fonts used at LIGHT WEIGHTS for headlines, creating an authoritative yet approachable voice. The contrast between spacious, atmospheric hero imagery and the stark, text-driven UI below creates a journey from aspiration to action.

## Colors

**Brand**
- **Mercury Blue** `#5266eb` — single vivid CTA accent

**Accent**
- Ghost Blue `#cdddff` — secondary buttons + hover (desaturated, ethereal)

**Surfaces (3-level dark stack)**
- Deep Space `#171721` — outermost (L0)
- Midnight Slate `#1e1e2a` — primary section bg (L1)
- Graphite `#272735` — interactive surfaces (L2)

**Text on dark**
- Starlight `#ededf3` — primary text (headlines, body, nav)
- Silver `#c3c3cc` — secondary, footer, disabled
- Lead `#70707d` — borders, dividers
- Pure White `#ffffff` — ONLY for text on the blue CTA

## Typography (LIGHT WEIGHT IS THE SIGNATURE)

**arcadiaDisplay** — major headlines
- Weights: **360**, 480, 530
- Sizes: 21, 24, 28, 32, 42, 49, 65px
- Letter spacing: subtle POSITIVE tracking (0.01–0.02em) — open feel
- **The 360 weight at 65px is the signature** — authority through restraint, not volume
- Substitute: Inter, Manrope

**arcadia** — body, UI labels, nav
- Weights: 360, 400, 420, 480
- Sizes: 12, 14, 16, 18, 21px
- Letter spacing: positive 0.005–0.02em
- Substitute: Inter, Manrope

### Type Scale (Major Second 1.125 from 20px base)

| Role | Size | Line Height | Tracking |
|------|------|-------------|----------|
| caption | 12px | 1.5 | +0.24px |
| body | 16px | 1.5 | +0.16px |
| heading | 32px | 1.2 | — |
| heading-lg | 49px | 1.15 | — |
| display | 65px | 1.1 | +0.65px |

## Spacing & Shape

- **Density: SPACIOUS**
- **Base unit:** 4px
- **Page max-width:** 1200px
- **Section gap:** 80–120px (HUGE breathing room)
- **Element gap:** 12–32px

**Border Radius (PILL SHAPES are the signature):**
- containers: 4px
- inputs: **32px** (full pill)
- buttons: **32px, 40px** (full pill)
- cards: 0px (no radius — sharp containers)

## Components

- **Primary Pill Button:** filled `#5266eb` bg, `#fff` text, **32px radius**, 16/24px padding, arcadia font
- **Header Pill Button:** translucent `#cdddff` ~20% bg, `#ededf3` text, 40px radius, 8/20px padding
- **Ghost Nav Link:** transparent, `#ededf3` text, no border, generous hit area
- **Hero Email Input:** transparent bg, `#ededf3` text, LEFT side 32px radius / RIGHT side 0 (joins the button into one pill)
- **Interactive Feature Link:** transparent + 1px bottom `#70707d` border, no radius, arcadiaDisplay for title
- **Footer Link:** transparent, `#c3c3cc` text (lower priority via lighter color)

## Do's
- arcadiaDisplay at light weight 360 for ALL major headlines (airy, sophisticated)
- Reserve `#5266eb` exclusively for primary CTAs
- `#171721` / `#1e1e2a` for ALL backgrounds (focused, immersive)
- **EXTREME corner radii (32px, 40px) for buttons — pill shapes are the signature**
- Maintain `#ededf3` text on dark for primary content
- Generous 80px+ vertical spacing between sections
- 1px bottom borders in `#70707d` to differentiate list items

## Don'ts
- ❌ Don't use `#5266eb` for text, backgrounds, or decorative elements
- ❌ Don't use heavy font weights (>530) for any typography
- ❌ Don't apply shadows for elevation — use color/opacity shifts
- ❌ Don't introduce new saturated colors — palette is monochrome plus ONE blue
- ❌ Don't use small corner radii on buttons — always pills
- ❌ Don't use `#fff` for body text — reserve for the blue CTA only
- ❌ Don't create dense layouts — prioritize breathing room

## Imagery

- **BIFURCATED visual language:**
- Opens with FULL-BLEED atmospheric photograph — solitary desk in vast natural landscape
- Imagery is purely ATMOSPHERIC, not product-focused
- Establishes mood of boundless ambition + serene focus
- Beyond the hero: starkly text-dominant, NO additional photography
- Vibe first, then transitions to functional info-driven experience

## Layout

- Full-bleed hero occupies ENTIRE VIEWPORT (atmospheric image bg)
- Centered headline + CTA over the bg image
- Below hero: max-width ~1200px centered, dark bg, single-column stacks
- Generous vertical spacing → calm linear reading flow
- Minimal semi-transparent top nav, becomes sticky
- Spacious + uncluttered

## Elevation

- NO shadows — elevation via LIGHT and COLOR
- Interactive elements brighten or adopt brand accent on hover/focus
- Layered surfaces differentiated by subtle gray shifts (Midnight Slate on Deep Space)

## Key Takeaway for AgentClip

Mercury's bones:
- ONE atmospheric hero image (mountain landscape) — establishes mood
- Below the hero: text-dominant calm, no more photography
- arcadiaDisplay at LIGHT 360 weight at 65px — authority through restraint (anti-convention)
- Mercury Blue is ONE chromatic accent, only on the CTA
- **PILL buttons (32–40px radius)** are the signature shape
- 80–120px section gaps, spacious density
- Custom font with positive letter-spacing (open feel) — opposite of Linear

This is exactly the "atmospheric hero photograph + text-driven UI below" pattern Eric described. For AgentClip:
- A landscape/mood photo OR illustration as full-bleed hero
- Below: text-driven editorial layout
- ONE chromatic accent (vermillion) on CTAs
- Pill-shape buttons (32px radius) as signature
- Light-weight headline type (Geist 300/400 at large sizes? or a serif at light)
