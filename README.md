# agentclip

The platform monorepo behind [agentclip.dev](https://agentclip.dev): a Django REST API at `api/` and a Next.js 15 frontend at `web/`. Open-source, MIT-licensed.

[![CI](https://github.com/ericelizes1/agentclip/actions/workflows/ci.yml/badge.svg)](https://github.com/ericelizes1/agentclip/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ericelizes1/agentclip/blob/main/LICENSE)
[![Django](https://img.shields.io/badge/django-6.0-092E20.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/next.js-15-000000.svg)](https://nextjs.org/)

> **Looking for the Python package, CLI, or MCP server?** Those live in the sister repo: [`ericelizes1/agentclip-python`](https://github.com/ericelizes1/agentclip-python).

## Stack

- **API** — Django 6 + Django REST Framework, drf-spectacular for OpenAPI, django-ratelimit for per-IP throttling
- **Web** — Next.js 15 (App Router), React 19, TypeScript 5 strict, Tailwind 4, Storybook 10, Vitest + Testing Library
- **Database** — Postgres ([Neon](https://neon.tech) in prod; sqlite for local dev)
- **Object storage** — [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) (S3-compatible via `boto3` + `django-storages`)
- **Hosting** — [Fly.io](https://fly.io) (`agentclip-api` and `agentclip-web` apps; Dockerfile-deployed)
- **Secrets** — [1Password](https://1password.com) (resolved into Fly's vault via `bin/sync-secrets.sh`)
- **CDN + DNS** — Cloudflare in front of both Fly apps

## Run locally

```bash
docker compose up --build
```

- Home page: <http://localhost:3000/>
- API: <http://localhost:8000/api/schema/swagger-ui/>
- Admin: <http://localhost:8000/admin/>

Or run the services natively (without Docker):

```bash
# api/
cd api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
DJANGO_DEBUG=true python manage.py migrate
DJANGO_DEBUG=true python manage.py runserver

# web/
cd web && pnpm install && pnpm dev
```

## API

| Method | Path | Auth | Rate limit |
|---|---|---|---|
| POST | `/api/slideshow/` | none | 20 / hour / IP |
| POST | `/api/slideshow/<id>/slides/` | `Authorization: Bearer <write_token>` | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/slides/<position>/` | write_token | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/` | write_token | 60 / hour / IP |
| GET | `/api/v1/gallery/` | none | (read; cached at the CDN) |
| GET | `/api/v1/slideshow/<share_token>/` | none | (read) |
| GET | `/api/v1/slideshow/<share_token>/edit-token/` | write_token | (recovery) |
| POST | `/api/v1/slideshow/<share_token>/rotate-edit-token/` | write_token | 60 / hour / IP |
| GET | `/api/schema/` | none | (OpenAPI 3 spec; powers the typed web client) |

The full contract lives in `web/lib/api-schema.json` (committed snapshot of the schema). The Python SDK in [`agentclip-python`](https://github.com/ericelizes1/agentclip-python) asserts on the wire shapes — if you change a response, link the matching SDK PR.

## Deploy

Two Fly apps, one shared monorepo, secrets resolved from 1Password.

```bash
# One-time bootstrap (creates the Fly apps; idempotent).
fly apps create agentclip-api
fly apps create agentclip-web

# Push secrets from 1Password into Fly's vault.
bin/sync-secrets.sh api
bin/sync-secrets.sh web

# Deploy. Each push to main triggers an auto-deploy via GitHub Actions
# (Unit 19); these commands let you deploy locally too.
cd api && fly deploy
cd web && fly deploy
```

Custom domains (set up once via `fly certs add`):

- `agentclip.dev` → `agentclip-web`
- `api.agentclip.dev` → `agentclip-api`

The Django Dockerfile runs `manage.py migrate` on every container start, so schema changes ship with the next deploy.

### Local Docker

Any Docker host works. Required env vars are listed in `api/.env.example`.

## Tests

```bash
# api
cd api && DJANGO_DEBUG=true python manage.py test slideshows  # 55 tests

# web
cd web && pnpm test  # 56 tests across 24 files
```

CI runs both suites plus a typecheck, lint, and Docker build on every PR.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The hard rules: atomic commits, no em dashes in user-facing copy, no model names in agent-facing copy, design system components for any new UI.

## License

MIT. See [LICENSE](LICENSE).
