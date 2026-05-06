# Contributing to AgentClip

This repo is the platform monorepo that powers [agentclip.dev](https://agentclip.dev) — Django REST API at `api/`, Next.js 15 frontend at `web/`. The Python SDK + CLI + MCP server lives in the sister repo [`ericelizes1/agentclip-python`](https://github.com/ericelizes1/agentclip-python).

## What kind of contributions are welcome

- **Bug fixes** to the API, web frontend, or admin.
- **Frontend polish.** Mobile especially. The design system is in `web/components/`; reuse primitives + composites instead of one-off styles.
- **Performance.** N+1 queries on the API side, hydration mismatches or oversized bundles on the web side.
- **Tests.** Coverage gaps in `api/slideshows/tests.py` (especially edge cases on the auth path) and in `web/components/**/*.test.tsx`.
- **Deployment recipes** for hosts beyond Fly.io: Render, Railway, Cloud Run, etc.

## What's out of scope (for now)

- **Account systems.** v1 is intentionally accountless; the `write_token` is the credential.
- **New auth schemes.** Bearer `write_token` is the contract the SDK depends on; changes here ripple.
- **Storage backends beyond Cloudflare R2** without a strong reason. R2 is the pinned default; the boto3-compatible interface in `settings.py` makes swapping possible if you want to.

## Dev setup

```bash
git clone https://github.com/ericelizes1/agentclip
cd agentclip
docker compose up --build
```

The web app is served at `http://localhost:3000`, the API at `http://localhost:8000`. Or run each natively — see [README.md](README.md#run-locally).

Tests:

```bash
# api
cd api && DJANGO_DEBUG=true python manage.py test slideshows

# web
cd web && pnpm test
cd web && pnpm test-storybook  # interaction + a11y across all stories
```

Lint:

```bash
# api
cd api && ruff check .

# web
cd web && pnpm lint && pnpm type:check
```

## How to propose a change

1. **Open an issue first** for non-trivial changes.
2. **Branch off `main`.** Atomic commits, conventional prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
3. **Migrations:** if you add or alter models, generate the migration in the same commit. Note any data backfill required in the PR description.
4. **Wire shapes are load-bearing.** The Python SDK's tests assert on the API response shapes; the web client's TypeScript types are generated from the OpenAPI schema. If you change a response, regenerate the schema (`cd api && python manage.py spectacular --file ../web/lib/api-schema.json --format openapi-json`) and the typed client (`cd web && pnpm gen:api`) in the same PR. Link any matching SDK PR.
5. **Mobile-first.** Verify at 390×844 (iPhone class) before assuming a layout works.
6. **Component tier discipline.** Primitives can't import from composites or patterns; composites can't import from patterns. The ESLint rule enforces it.

## Hard rules for user-facing copy

Project conventions; the reviewer holds the line:

- **No em dashes** in user-facing copy.
- **No model or vendor names** ("Claude" / "GPT" / etc.) in marketing copy.
- **Founders / operators / engineers** is the audience phrasing.
- **Honest claims.** No invented stars, users, or production deployments.

## License

By contributing, you agree your contribution is licensed under the [MIT License](LICENSE).
