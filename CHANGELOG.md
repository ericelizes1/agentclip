# Changelog

All notable changes to this service are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by deploy date for the hosted service.

## [Unreleased]

## [0.1.0] - 2026-05-06

First tagged release. Live at https://agentclip.dev. Same hosted backend the `agentclip` Python package speaks to by default.

### Added

- **Two-service monorepo** (`api/` + `web/`) replacing the original single-Django-service architecture. Django stays the API/admin/storage layer; Next.js 15 + Tailwind 4 + Storybook 10 owns every public HTML surface (home, viewer, edit, OG images, 404).
- **Edit page** at `/s/<share_token>/edit?t=<edit_token>` with edit-token rotation and recovery endpoints; tokens never persist to localStorage.
- **Per-slide titles** in addition to captions. Mobile viewport tuned for one-thumb scroll.
- **Gradient creator avatar** in the viewer hero (replaces the plain "Filed by …" line). Same name produces the same gradient deterministically; full name shown on hover via Radix Tooltip.
- **Per-clip OG image** generated dynamically at `/s/<token>/opengraph-image` so social previews show the actual title + creator instead of a generic fallback.
- **Gallery** at `GET /api/v1/gallery/` (curated, hand-flagged) plus `seed_gallery` management command for bootstrapping demo content.
- **`DELETE /api/slideshow/<id>/`** — combined PATCH/DELETE detail endpoint. Cascades to slides via FK.
- **Per-slideshow caps**: 20 slides, 100 MB total. Enforced at upload time with a delta check on PATCH so replacing a large slide can't bypass the cap.
- **`AGENTCLIP_PUBLIC_BASE_URL`** support in serializers so URLs emitted from inside the Fly mesh always point at the public host, never the upstream `agentclip-api.internal`.
- **`R2_PUBLIC_HOST`** env var rewriting media URLs to a custom CDN domain (currently `cdn.agentclip.dev` fronting the R2 bucket).
- **`justfile`** with `api-dev`, `web-dev`, `test`, `gen-types`, `deploy-api`, `deploy-web`, `logs-api`, `logs-web`, `ssh-api`, and a guarded `release` recipe.
- **`docker-compose.yml`** + per-service `Dockerfile` for one-command local dev.
- **`render.yaml`** Infrastructure-as-Code spec (kept for parity even though prod runs on Fly).
- **Mintlify docs site** under `docs-site/` for the API + SDK reference.

### Changed

- **Infra stack pivoted** from DigitalOcean App Platform + DO Spaces + DO Managed Postgres to **Fly.io** (`agentclip-api` + `agentclip-web` apps in `iad`) + **Cloudflare R2** (object storage, fronted by `cdn.agentclip.dev`) + **Neon** (serverless Postgres). Secrets sourced from 1Password via `bin/sync-secrets.sh`.
- **Fly machine memory: 256MB → 768MB** for the api app. 256MB OOM'd on the first real R2 upload because boto3's botocore service definitions plus a multipart buffer pushed gunicorn workers past the limit.
- Removed Django templates and the template-driven viewer; the Next.js viewer is the only public UI now. Django serves API + admin only.

### Notes

- Three custom domains, all behind Cloudflare (proxied + WAF + rate-limit rule on `/api/*`):
  - `agentclip.dev` → `agentclip-web` (Next.js)
  - `www.agentclip.dev` → `agentclip-web`
  - `api.agentclip.dev` → `agentclip-api` (Django)
  - `cdn.agentclip.dev` → R2 bucket `agentclip-prod` (custom domain)
- 28-test API suite covering auth, position assignment, IP forensics, rate-limit 429s, gallery feed, edit-token recovery/rotation, slide DELETE, slideshow DELETE, and per-slideshow caps.

## [2026-05] - initial deploy

### Added

- Two-table data model (`Slideshow`, `Slide`) with UUID primary keys, 16-char `share_token`, and 32-char `write_token`. Tokens generated via `secrets.token_urlsafe`; `write_token` compared with `secrets.compare_digest`.
- Four DRF endpoints matching the public SDK contract:
  - `POST /api/slideshow/` (anonymous, rate-limited 20/hour per IP)
  - `POST /api/slideshow/<id>/slides/` (Bearer write_token, 200/hour)
  - `PATCH /api/slideshow/<id>/slides/<position>/` (Bearer, 200/hour)
  - `PATCH /api/slideshow/<id>/` (Bearer, 60/hour)
- Custom DRF exception handler converting `Ratelimited` to HTTP 429 with `WWW-Authenticate: Bearer` for missing-credential responses.
- Public viewer at `/s/<share_token>/` and landing page at `/`. Mobile-first, Geist Sans + Geist Mono, single vermillion accent.
- Cloudflare R2 storage via `django-storages` + `boto3` (S3-compatible). Local FileSystemStorage fallback when `R2_ACCESS_KEY_ID` is unset, so contributors can run zero-config.
- WhiteNoise for static files, gunicorn for the WSGI server, single-container deploy.
- 20-test integration suite covering the API (auth, position assignment, IP forensics, cross-slideshow token reuse), rate-limit 429 behavior, and viewer rendering.
- Fly.io app specs at `api/fly.toml` and `web/fly.toml`. Each `Dockerfile` runs migrations on container start (api) or boots the Next.js standalone server (web).

[Unreleased]: https://github.com/ericelizes1/agentclip/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ericelizes1/agentclip/releases/tag/v0.1.0
