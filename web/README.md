# web

Next.js 15 front-end for AgentClip — the public site at `agentclip.dev` that renders the home page and `/s/[token]` viewer. Consumes the Django API at `api.agentclip.dev`.

## Stack

- **Next.js 15** (App Router, Server Components by default)
- **React 19**
- **TypeScript 5** (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`)
- **Tailwind CSS 4** (CSS-first `@theme` block in `app/globals.css`; design tokens in `lib/tokens.ts`)
- **Radix UI primitives** wrapped via `class-variance-authority` + `tailwind-merge`
- **framer-motion** for component-level micro-interactions
- **lucide-react** for UI icons, `@icons-pack/react-simple-icons` for brand marks (GitHub, etc.)

## Getting started

```bash
cd web
pnpm install
pnpm dev
```

Visit http://localhost:3000.

## Scripts

| Script              | What it does                          |
|---------------------|---------------------------------------|
| `pnpm dev`          | Next dev server                       |
| `pnpm build`        | Production build                      |
| `pnpm start`        | Serve the production build            |
| `pnpm lint`         | ESLint (Next config + import-direction rules between component tiers) |
| `pnpm type:check`   | `tsc --noEmit`                        |
| `pnpm format`       | Prettier write                        |

## Component architecture

Three tiers. Imports flow strictly downward — ESLint enforces it:

```
components/
├── primitives/     # design-system atoms (Button, Input, Badge, etc.)
├── composites/     # task-shaped (NarrationControls, EditableCaption)
└── patterns/       # page-shaped (HeroSection, GalleryGrid, ClipViewer)
```

`primitives/` cannot import from `composites/` or `patterns/`. `composites/` cannot import from `patterns/`. `patterns/` is free to import from anywhere below.

## Design tokens

The single source of truth lives in `lib/tokens.ts`. The values are mirrored in `app/globals.css`'s Tailwind `@theme` block so utility classes (`bg-vermillion-500`, `rounded-pill`, etc.) generate at build time. Keep the two files in lockstep.

The token values come from a research pass on Anthropic + Slite (warm parchment + editorial typography + single chromatic accent + whisper-shadow elevation). See `docs/research/refero-design-prompts/` at the repo root for the full extracted style references.

## Where the locked design lives

`docs/mockups/index.html` (repo root) is the production-fidelity HTML preview that the Phase B–D units build against. Visual diffs against the mockup are part of the Unit 13 verification step.
