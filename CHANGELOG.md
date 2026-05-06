# Changelog

All notable changes to this service are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by deploy date for the hosted service.

## [Unreleased]

### Changed

- Infra stack pivoted from DigitalOcean App Platform + DO Spaces + DO Managed Postgres to **Fly.io** (api + web apps) + **Cloudflare R2** (object storage) + **Neon** (Postgres). Secrets sourced from 1Password via `bin/sync-secrets.sh`.

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

[Unreleased]: https://github.com/ericelizes1/agentclip/compare/main...HEAD
