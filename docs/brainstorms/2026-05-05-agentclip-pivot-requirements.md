---
title: AgentClip pivot — monorepo restructure, Next.js perfection-bar UI, two-repo OSS shape
type: requirements
status: ready-to-plan
date: 2026-05-05
---

# AgentClip pivot: monorepo restructure, Next.js perfection-bar UI, two-repo OSS shape

## TL;DR

Two repos, both on Eric's personal profile. Replace Django templates with a Next.js 15 + Tailwind 4 + Storybook 10 web frontend living inside the platform monorepo. Ship a polished design system with shadcn-style primitives, dynamic per-clip OG images, Mintlify-hosted docs, and Render as the canonical deploy target. License stays MIT. Python SDK stays what it is; rename only.

## Why It Matters

The current state ships a working API and a working Django-templated UI. It's fine, but it doesn't match the 2026 OSS dev-tool aesthetic recruiters at design-conscious AI companies (Linear, Cursor, Modal, Vercel) recognize as taste-aligned. Eric's portfolio play is "shipped product" framing, which depends on the public surfaces (`agentclip.dev`, `docs.agentclip.dev`) reading as polished as Cal.com / Plane / Langfuse. The Django template UI does not clear that bar; a Next.js + Tailwind + Storybook + Mintlify-docs pairing does.

This is also the right architectural moment. Pre-launch, before any production data, before any external users. Restructuring the repo, adding Next.js, deleting templates — all cheap now, expensive later.

## The Architecture

### Two repos

| Repo | URL | Role |
|---|---|---|
| `agentclip` | `github.com/ericelizes1/agentclip` | The platform. Monorepo containing `api/` (Django + DRF + Postgres) and `web/` (Next.js 15 + Tailwind + Storybook). One README, one star-getter. |
| `agentclip-python` | `github.com/ericelizes1/agentclip-python` | The Python client. SDK + CLI + MCP server + bundled skill. Publishes the `agentclip` package to PyPI. |

Both repos owned by Eric's personal GitHub account, not an org. Pinned at the top of his profile. Migration to an org costs ~30 seconds via GitHub's transfer flow if/when AgentClip ever has a co-maintainer or commercial entity.

JS SDK (`agentclip-js`) deferred to v0.2 launch after the Python wire shape has been battle-tested.

### Inside `agentclip`

```
agentclip/
├── api/                    Django + DRF (moved from current root)
│   ├── slideshows/
│   ├── agentclip_app/
│   ├── manage.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── ...
├── web/                    Next.js 15 + Tailwind 4 + Storybook 10 (NEW)
│   ├── app/                App Router pages
│   ├── components/         primitives/ → composites/ → patterns/
│   ├── lib/                api client (typed from DRF OpenAPI), tokens, utilities
│   ├── .storybook/
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml      docker compose up → postgres + api + web for local dev
├── render.yaml             Render-native IaC for the hosted deploy
├── .do/app.yaml            Alternative deploy spec for self-hosters
├── docs/                   Plans and design docs (already exists)
├── .github/workflows/      Separate api-ci.yml + web-ci.yml jobs
└── README.md
```

The Django templates (`templates/base.html`, `slideshows/templates/`) get deleted as part of the pivot. The two view functions that rendered them (`slideshow_viewer`, `home`) get deleted. The DRF endpoints, models, admin, tests, and deploy specs all stay.

## Decisions Locked at v0.1.0

### Page set: two pages on Next.js + Mintlify docs

| URL | Tech | Purpose |
|---|---|---|
| `agentclip.dev/` | Next.js page on Render | Home: hero, install, how-it-works, curated gallery, closing |
| `agentclip.dev/s/[token]/` | Next.js dynamic route on Render | Viewer: clip metadata, summary callout, slide list with credit |
| `docs.agentclip.dev` | Mintlify (hosted, free for OSS) | Quickstart, MCP setup, CLI reference, self-hosting, API reference |
| `agentclip.dev/s/[token]/opengraph-image` | Next.js OG image generator | Per-clip dynamic social-share card |

No `/self-host`, no `/docs` on the Next.js side. Self-host content lives in Mintlify docs; in-app docs are deferred. 404 page and error boundary are part of the Next.js app skeleton.

### Tech stack for `web/`

- **Next.js 15 + React 19 + TypeScript 5** with App Router and Server Components by default
- **Tailwind CSS 4** with `@tailwindcss/postcss` (matches `manifest`)
- **Storybook 10** with `addon-a11y`, `addon-docs`, `test-runner` — every component has a `.stories.tsx` co-located, and stories include `play` interactions via `@storybook/test`
- **Vitest + Testing Library + happy-dom** for unit/component tests (greenfield choice over Jest+Babel; matches 2026 norm)
- **Three component tiers** with enforced import direction via ESLint:
  - `components/primitives/` — Button, Pill, Badge, Card, Code, Tooltip, Dialog, Avatar, Tabs, Skeleton (10)
  - `components/composites/` — ClipCard, MediaFrame, SummaryCallout, MetaRow, CodeBlock, NavBar (6)
  - `components/patterns/` — ClipViewer, GalleryGrid, HeroSection (3)
  - Total: ~19 components, all with Storybook stories
- **Radix UI** under the hood for any a11y-sensitive primitive (Tooltip, Dialog, Tabs)
- **`class-variance-authority` + `tailwind-merge`** for variant components
- **Icons**: `lucide-react` (generic UI) + `@icons-pack/react-simple-icons` (brand icons: GitHub, X, npm, PyPI)
- **`framer-motion`** for hero reveals and transitions, with `useReducedMotion` honored at component level
- **Tokens.ts** as single source of truth: vermillion (`#d94824`), ink, paper palette + Geist Sans / Geist Mono via `next/font/google` → consumed by Tailwind config AND Storybook

### Lighthouse CI gate

- Accessibility ≥ 95 → **hard fail** (PR blocked)
- Performance ≥ 90, Best Practices ≥ 95, SEO ≥ 95 → **warn only** during the launch arc, promotable to hard fail post-launch once budgets stabilize
- Bundle-size budget enforced separately: First Load JS ≤ 100KB on `/`, ≤ 130KB on `/s/[token]`

### Hosting and infra-as-code

- **Render for both `api` and `web`** services via repo-committed `render.yaml`. Eric already knows Render; same platform self-hosters can use; one dashboard.
- **`.do/app.yaml` retained** as an alternative deploy spec for self-hosters who prefer DigitalOcean.
- **`docker-compose.yml` at repo root** brings the whole stack up locally with a single command for any contributor.
- **Mintlify** for docs at `docs.agentclip.dev` (hosted, free for OSS, separate from Render).
- **No Terraform at v0.1.** Deferred to v0.2 if ever a multi-cloud need appears.

### License

MIT for both repos. Documented choice in CONTRIBUTING.md so the rationale is explicit. Switch path to AGPL or BUSL/FSL is a half-day chore documented in CHANGELOG.md, available later if AgentClip ever has a real business model to defend.

### OG images

Per-clip dynamic social-share cards via Next.js `app/s/[token]/opengraph-image.tsx`. Card includes: AgentClip wordmark with vermillion bullet, clip title, first slide preview with vermillion border, "Filed by [name] · N clips" attribution row.

## Success Criteria

What "shipped v0.1.0" means concretely:

1. `agentclip.dev` loads in under 1.0s on mobile 4G (Lighthouse mobile preset)
2. `agentclip.dev/s/<token>` renders a real clip end-to-end: title, description, summary card, mixed image + video slides, "Filed by" credit linking to creator URL
3. Sharing a clip URL in Slack / Twitter / LinkedIn shows the dynamic per-clip OG card (verified via the platforms' own debuggers)
4. `docs.agentclip.dev` has at least five documented sections (install, MCP setup, CLI reference, self-hosting, troubleshooting), each MDX-styled with the AgentClip aesthetic
5. Storybook builds successfully on every PR; all ~19 components have at least one story; addon-a11y reports clean
6. Lighthouse a11y ≥ 95 on both Next.js pages, with the gate enforced in CI
7. `pip install agentclip && agentclip slideshow create --title test` works against `agentclip.dev` from a fresh machine
8. `docker compose up` from a fresh clone of `agentclip` boots api + web + postgres locally and the home page renders at `localhost:3000`
9. `render.yaml` deploys both services + Postgres successfully on a fresh Render account (ops smoke test)
10. README badges (PyPI, CI, License, Python versions on `agentclip-python`; CI, License, Live demo on `agentclip`) all resolve green

## Out of Scope

Explicit non-goals at v0.1.0:

1. **JS SDK (`agentclip-js`).** Deferred to v0.2 once Python wire shape is battle-tested.
2. **Account / login system.** v1 stays accountless; the `write_token` is the only credential.
3. **Browser harness.** AgentClip is the upload layer, not a browser-driving runtime. Agents use their existing browser tools.
4. **Real-time client-side state.** No live updates, no websockets, no slide reordering UI. The clip is published once at end of run.
5. **Form primitives, navigation primitives, advanced motion components, error states.** All deferred from the design system at v0.1.0; revisit when an actual page needs them.
6. **Terraform IaC.** `render.yaml` is sufficient infra-as-code for v0.1.
7. **Public delete endpoint or admin delete UX in the viewer.** Django admin is the operator surface for v0.1.
8. **Custom domain mapping in code.** DNS is owned out-of-band in Cloudflare/registrar account.
9. **Localization.** Strings are routed through a `t()` helper for future i18n readiness, but only English is shipped.
10. **Server-side video thumbnail extraction.** OG cards for video-only clips fall back to the AgentClip default card.

## Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| Two repos, not three | Multi-language SDKs in separate repos is unanimous in the OSS dev-tool reference set (Sentry, PostHog, Plane, Langfuse, Supabase, Resend). Web + API in same monorepo is also unanimous in that set. Splitting web off has no precedent. |
| Personal profile, not org | Solo-author state. Direct portfolio attribution. Pinned repo signal. Migration to org is ~30s if Eric ever incorporates or hires. |
| Replace Django templates entirely | Single UI codebase, single design system, single Storybook. Avoids the drift that comes from maintaining two template stacks. Next.js App Router handles SEO and OG cards natively. |
| Next.js + Tailwind + Storybook + lucide + simple-icons | Matches `manifest`'s established stack so visual taste carries across Eric's repos. Matches the de facto 2026 OSS dev-tool stack used by Cal.com, Plane, Trigger.dev, Resend. |
| Component tiers with ESLint-enforced import direction | Architectural drift becomes a lint error rather than a code-review judgment call. Storybook stories per component are required, not aspirational. |
| OG images at v0.1.0 | Massive social-share polish for half-day cost. Every shared clip URL becomes a brand surface. |
| Render for both api and web | Eric knows it. Self-hosters can use it. One platform. Free tier covers v0.1. |
| MIT license | Maximum distribution. Solo portfolio play. Switch to AGPL/BUSL later if commercial threat materializes (Sentry's exact path). |
| Mintlify for docs | Dominant 2026 OSS dev-tool docs platform (Resend, Trigger.dev, Langfuse, Anthropic). Free for OSS. Half-day setup; gorgeous instantly. |
| Lighthouse a11y hard gate at 95+ | Accessibility is non-negotiable; performance flexes during iteration. |

## Dependencies / Assumptions

- Eric owns `agentclip.dev` and can configure DNS for `docs.agentclip.dev` and (optionally) `api.agentclip.dev`.
- Eric has Render account access (already confirmed; he uses it).
- DigitalOcean Spaces account exists for object storage (already configured).
- Mintlify free-for-OSS tier is still available at launch (verifiable closer to time).
- Geist and Geist Mono remain available via Google Fonts (currently are).
- npm package name `agentclip` is reserved or available; if taken, fall back to `@agentclip/sdk` scoped (deferred to v0.2 with the JS SDK).

## Outstanding Questions

### Resolved during brainstorming

- Two repos vs three: **two**
- Personal profile vs org: **personal**
- Python first vs both languages at launch: **Python first, JS in v0.2**
- Replace Django templates or keep both: **replace entirely**
- Page set: **two pages + Mintlify docs**
- OG images: **dynamic per-clip cards**
- Component scope: **core + adjacent (~19 components)**
- Lighthouse gate: **a11y hard 95, others warn**
- Hosting: **Render for both**
- Render strategy: **server components by default**
- License: **MIT**
- IaC: **render.yaml; Terraform deferred**

### Deferred to planning

- Exact Tailwind v4 token-consumption pattern (CSS-first via `@theme` blocks vs config-first via `tailwind.config.ts`)
- next/font/google configuration for Geist + Geist Mono with weight/subset choices
- Satori font configuration for OG image generation (subset, format)
- Vitest config specifics (coverage thresholds, test environment)
- Storybook addon-a11y CI integration mode (severity threshold)
- Whether the typed API client uses `openapi-typescript` (build-time codegen from DRF schema) or hand-curated types
- Specific `next/image` config for slide thumbnails and OG previews
- Skeleton component animation timing and palette
- Component naming convention details (e.g., `Button` vs `<Button.Root>` compound vs flat)
- Specific Mintlify nav structure and which API endpoints get auto-documented from the OpenAPI schema
- The actual rename order for repos (do we wait until push time or rename local dirs first?)

## Sources & References

- Prior plan: `docs/plans/2026-05-05-001-feat-agentclip-launch-arc-plan.md` (covered the pre-pivot launch arc; superseded for the web side, retained for the SDK + DO-deploy side)
- Reference repo for taste and conventions: `manifest` (Eric's other Next.js + Tailwind + Storybook + Radix + lucide project)
- 2026 OSS dev-tool architecture research from this conversation: Plane, Cal.com, PostHog, Sentry, Supabase, Trigger.dev, Langfuse, n8n
- Earlier OSS launch best practices research from this conversation (CI workflow, Dependabot, issue templates, awesome-mcp-servers PR pattern)
