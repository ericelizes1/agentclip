# api

Django REST Framework backend for AgentClip — the API at `api.agentclip.dev` that the SDK and the Next.js frontend both talk to.

## Stack

- **Django 6** + **Django REST Framework 3.17**
- **drf-spectacular** for OpenAPI 3 schema generation (consumed by the typed web client)
- **django-storages** + **boto3** for S3-compatible object storage (Cloudflare R2 in prod)
- **django-ratelimit** for per-IP rate limits
- **django-unfold** for the admin theme (vermillion-accented, mirrors the public-site palette)
- **WhiteNoise** for static files, **gunicorn** for WSGI
- **Postgres** in prod (Neon), **sqlite** for local dev

## Run locally

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

DJANGO_DEBUG=true python manage.py migrate
DJANGO_DEBUG=true python manage.py createsuperuser   # for /admin/
DJANGO_DEBUG=true python manage.py runserver
```

Visit:
- API: <http://localhost:8000/api/schema/swagger-ui/>
- Admin: <http://localhost:8000/admin/>

Or run the whole monorepo via `docker compose up --build` from the repo root.

## API surface

| Method | Path | Auth | Rate limit |
|---|---|---|---|
| POST | `/api/slideshow/` | none | 20 / hour / IP |
| POST | `/api/slideshow/<id>/slides/` | `Bearer <write_token>` | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/slides/<position>/` | write_token | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/` | write_token | 60 / hour / IP |
| GET | `/api/v1/gallery/` | none | (read) |
| GET | `/api/v1/slideshow/<share_token>/` | none | (read) |
| GET | `/api/v1/slideshow/<share_token>/edit-token/` | write_token | (recovery) |
| POST | `/api/v1/slideshow/<share_token>/rotate-edit-token/` | write_token | 60 / hour / IP |
| PATCH | `/api/v1/slideshow/<share_token>/slides/<position>/caption/` | `Bearer <edit_token>` | 200 / hour / IP |
| DELETE | `/api/v1/slideshow/<share_token>/slides/<position>/` | edit_token | 200 / hour / IP |
| GET | `/api/schema/` | none | (OpenAPI 3 spec) |
| GET | `/api/schema/swagger-ui/` | none | (Swagger UI) |

Two parallel auth surfaces, deliberately:

- **`write_token`** — issued once at create time, returned to the SDK. Authorizes the full mutation surface (add slides, replace media, edit metadata, rotate edit URL).
- **`edit_token`** — embedded in the share-edit URL. Authorizes a narrower surface (caption edits + slide deletes only). The web edit page at `/s/<share_token>/edit?t=<edit_token>` is the canonical consumer.

If you change a response shape, regenerate the OpenAPI snapshot the web client compiles against:

```bash
cd api
DJANGO_DEBUG=true python manage.py spectacular --validate \
  --file ../web/lib/api-schema.json --format openapi-json
cd ../web && pnpm gen:api
```

## Tests

```bash
DJANGO_DEBUG=true python manage.py test slideshows
```

66 integration tests as of v0.1, covering API, auth (write_token + edit_token), rate-limit 429 behavior, gallery curation, OpenAPI schema coverage, and the admin smoke path. Tests use `APIClient` so the full URL → middleware → auth → view → serializer chain fires per case.

## Storage backends

By default the app uses Django's `FileSystemStorage` so a fresh clone runs zero-config. Set the `R2_*` env vars (see `.env.example`) to switch to Cloudflare R2 — `settings.py` flips to `S3Boto3Storage` automatically. Any S3-compatible store works as long as the boto3 endpoint URL is reachable.

## Deploy

The container at `api/Dockerfile` runs `manage.py migrate` on startup, so schema changes ship with the next deploy. See the root [`README.md#deploy`](../README.md#deploy) for the Fly.io workflow.

## Conventions

- **No model or vendor names** in user-facing copy.
- **No em dashes** in user-facing copy.
- **Atomic commits**, conventional prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **Wire shapes are load-bearing**: the SDK in [`agentclip-python`](https://github.com/ericelizes1/agentclip-python) and the typed web client both pin to these responses. Migrations + schema regeneration land in the same commit as a contract change.
