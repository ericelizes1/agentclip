# web

Next.js 15 frontend for AgentClip — the public site at `agentclip.dev` (home page + `/s/[token]` viewer + `/s/[token]/edit` editor). Consumes the Django API at `api.agentclip.dev` via a typed fetch client generated from the API's OpenAPI 3 schema.

## Stack

- **Next.js 15** (App Router; Server Components by default; `output: 'standalone'` for the slim production Dockerfile)
- **React 19**
- **TypeScript 5** with the perfectionism flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **Tailwind CSS 4** (CSS-first `@theme` block in `app/globals.css`; design tokens in `lib/tokens.ts`)
- **Storybook 10** + **Vitest 3** + **Testing Library 16** + **happy-dom 15** + axe-core via `@storybook/addon-a11y`
- **Radix UI primitives** wrapped via `class-variance-authority` + `tailwind-merge`
- **framer-motion** for component-level micro-interactions, with `useReducedMotion` honored everywhere
- **lucide-react** for UI icons, `@icons-pack/react-simple-icons` for brand marks
- **openapi-fetch** + **openapi-typescript** — typed API client generated from the backend's `/api/schema/`

## Getting started

```bash
cd web
pnpm install
pnpm dev
```

Visit <http://localhost:3000>. Or run the whole monorepo via `docker compose up --build` from the repo root.

## Scripts

| Script              | What it does                          |
|---------------------|---------------------------------------|
| `pnpm dev`          | Next dev server                       |
| `pnpm build`        | Production build (standalone output)  |
| `pnpm start`        | Serve the production build            |
| `pnpm lint`         | ESLint (Next config + import-direction rules between component tiers) |
| `pnpm type:check`   | `tsc --noEmit`                        |
| `pnpm format`       | Prettier write                        |
| `pnpm test`         | Vitest (one-shot)                     |
| `pnpm test:watch`   | Vitest watch mode                     |
| `pnpm test:coverage`| Vitest with v8 coverage               |
| `pnpm storybook`    | Storybook dev server on :6006         |
| `pnpm build-storybook` | Storybook static build              |
| `pnpm gen:api`      | Regenerate `lib/api-types.ts` from the committed `lib/api-schema.json` |
| `pnpm gen:api:live` | Regenerate from a running API (`AGENTCLIP_API_URL=http://localhost:8000 pnpm gen:api:live`) |

## Component architecture

Three tiers. Imports flow strictly downward — ESLint enforces it:

```
components/
├── primitives/     # Button, Pill, Badge, Card, Code, Tooltip, Dialog, Avatar, Tabs, Skeleton
├── composites/     # ClipCard, MediaFrame, SummaryCallout, MetaRow, CodeBlock, NavBar, EditableCaption, DeleteSlideButton
└── patterns/       # HeroSection, GalleryGrid, ClipViewer
```

`primitives/` cannot import from `composites/` or `patterns/`. `composites/` cannot import from `patterns/`. `patterns/` is free to import from anywhere below.

Every component ships with a colocated `.tsx` + `.stories.tsx` + `.test.tsx` triplet. Stories render with the locked tokens loaded; the a11y addon runs axe-core against each story and fails on any violation.

## Routes

| Path                              | Type      | Source                                |
|-----------------------------------|-----------|---------------------------------------|
| `/`                               | Static (ISR=1m) | `app/(home)/page.tsx`            |
| `/s/[token]`                      | Dynamic   | `app/s/[token]/page.tsx`              |
| `/s/[token]/edit?t=<edit_token>`  | Dynamic   | `app/s/[token]/edit/page.tsx`         |
| `/s/[token]/opengraph-image`      | Dynamic PNG | `app/s/[token]/opengraph-image.tsx` |
| `/install.md`                     | Static    | `public/install.md`                   |
| 404                               | Static    | `app/not-found.tsx`                   |
| Error boundary                    | Client    | `app/error.tsx`                       |

## Typed API client

`lib/api.ts` wraps `openapi-fetch` with the `paths` types from `lib/api-types.ts`. A wrong field name like `client.POST('/api/slideshow/', { body: { titel: '...' } })` is a **TypeScript error**, not a runtime 400.

The generated `lib/api-types.ts` is committed so CI doesn't need a running backend to build. Drift is caught the next time someone runs `pnpm gen:api:live` — `pnpm type:check` then fails until both sides agree.

## Design tokens

The single source of truth lives in `lib/tokens.ts`. The values are mirrored in `app/globals.css`'s Tailwind 4 `@theme` block so utility classes generate at build time. Keep the two files in lockstep.

The token values come from a research pass on Anthropic + Slite (warm parchment + editorial typography + single chromatic accent + whisper-shadow elevation). The production-fidelity HTML mockup at `docs/mockups/index.html` (repo root) is the target the React components compose toward.
