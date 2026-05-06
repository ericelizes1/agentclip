---
title: Navbar + brand identity for v0.1
status: ready-for-planning
created: 2026-05-06
owner: eric
scope: lightweight
---

# Navbar + brand identity for v0.1

## Problem

The current navbar at `web/components/composites/NavBar/NavBar.tsx` uses a
10×10px vermillion dot as the brand mark — a placeholder from the initial
scaffold. The dot doesn't carry any of the "AgentClip" concept, and the
favicon inherits the same nothing-y mark. This brainstorm settles three
header-level brand decisions that have been deferred since the platform pivot.

## Decisions

### 1. Logo: Admit-One ticket pictogram, navbar-only

Replace the red dot with a small **landscape ticket** SVG — rounded rectangle
with a perforated tear edge on one side, the universal "Admit One" silhouette.

- **Scope**: navbar mark + favicon + OG image fallback. Clips themselves stay
  unstyled in v0.1 (no torn-edge gallery cards, no stub framing in viewer).
- **Why ticket**: matches the "AgentClip" concept — each shareable clip is a
  ticket-stub artifact of an agent run. Pairs well with the existing "Filed by"
  and "Recent fieldwork" newsroom-adjacent copy.
- **Why Admit-One specifically over alternatives**: instantly readable as
  "ticket" at navbar scale (16–20px). Other shapes considered:
  - **Minimal portrait stub** — more brand-distinct but harder to read as a
    ticket at small size.
  - **Diagonal-cut** — most ownable silhouette but takes more refinement to
    nail proportions; deferred to v0.2 if the classic feels generic.
- **Why navbar-only, not brand-pattern across clips**: brand-pattern was the
  alternative — every gallery card and viewer hero gets a torn-edge ticket
  frame. Higher upside, more carrying cost, and risks "theme park" overdesign.
  Navbar-only is the safe v0.1 move; brand-pattern remains an open v0.2
  upgrade if the simple version feels under-cooked.

### 2. GitHub stars count: not displayed in v0.1

Do not show a live star count anywhere in the UI for v0.1.

- **Why**: a brand-new repo will have <10 stars in week one; "★ 0" or "★ 3"
  reads as *negative* social proof. Showing nothing is stronger than
  showing a small number.
- **Trigger for v0.2**: revisit when the repo crosses ≥ 100 stars or after a
  launch tweet boost — at that point a navbar badge becomes net positive.
- **Implementation note for the planner**: nothing to build now. The future
  badge is a small client component hitting `api.github.com/repos/...`
  cached with `revalidate: 3600`; not worth scaffolding ahead of need.

### 3. Other navbar links: none added

Keep the navbar to **logo (left) + GitHub button (right)**. No Demo, Docs,
PyPI, Discord, or blog links.

- **Why**: every navbar link dilutes the primary CTA (open the repo). The
  home page already surfaces the install snippet, How it works, gallery, and
  the same GitHub link in the hero — body content does the selling. Navbar
  minimalism reads as confidence at v0.1 scale.
- **Open for v0.2**:
  - **Demo link** — high-value once a polished real-flow slideshow exists.
    Today's smoke-test clip (`0d1d73da-19a9-4e82-ae48-9ff3c3216a26`) is not
    portfolio quality. A real first-class demo (one focused QA run, well
    captioned, real screenshots) is the strongest "show don't tell" link
    we could add.
  - **Docs link** — appropriate when the Mintlify site at `docs-site/` is
    fleshed out beyond the scaffold. Adding a thin link makes the gap visible.

## Scope boundaries

- In scope: replacing the navbar mark and favicon with the ticket SVG, no
  visual changes to clips, gallery, or viewer.
- Out of scope: torn-edge gallery cards, ticket-stub viewer hero, stars
  badge, additional navbar links, OG image redesign.

## Success criteria

- Navbar at `agentclip.dev` shows a small Admit-One ticket pictogram (≤ 20px
  high) next to the "AgentClip" wordmark instead of the vermillion dot.
- Favicon and OG fallback use the same mark, so browser tabs and link
  unfurls match the live site.
- The ticket reads as a ticket at small size on both light and dark
  backgrounds (storybook stories cover both).
- No regression to the existing GitHub button or Hero CTA.

## Implementation hints (for the planner, not part of this brainstorm)

- Mark lives as a self-contained SVG component (suggested:
  `web/components/primitives/TicketMark/TicketMark.tsx`) so the navbar,
  favicon route, and OG image can all import the same shape.
- Existing color tokens: `--vermillion-500` for fill, `--ink-900` for outline.
  The ticket should work as either a vermillion-filled mark or an ink outline;
  let the planner pick based on contrast against `--paper`.
- Replace the inline `<span class="size-2.5 rounded-full bg-vermillion-500">`
  in `web/components/composites/NavBar/NavBar.tsx` with the new component.
- Favicon route at `web/app/icon.tsx` (Next.js dynamic icon) renders the same
  SVG so dev/prod stays in sync.
