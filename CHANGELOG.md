# Changelog

All notable changes to this service are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned by deploy date for the hosted service.

## [Unreleased]

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
- DigitalOcean Spaces storage via `django-storages` + `boto3` (S3-compatible). Local FileSystemStorage fallback when `DO_SPACES_KEY` is unset, so contributors can run zero-config.
- WhiteNoise for static files, gunicorn for the WSGI server, single-container deploy.
- 20-test integration suite covering the API (auth, position assignment, IP forensics, cross-slideshow token reuse), rate-limit 429 behavior, and viewer rendering.
- DigitalOcean App Platform spec at `.do/app.yaml`. `Dockerfile` runs migrations on container start.

[Unreleased]: https://github.com/ericelizes/agentclip-app/compare/main...HEAD
