# agentclip-app

The Django backend that powers [agentclip.dev](https://agentclip.dev): the API the SDK posts to and the public viewer where clips render.

[![CI](https://github.com/ericelizes/agentclip-app/actions/workflows/ci.yml/badge.svg)](https://github.com/ericelizes/agentclip-app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ericelizes/agentclip-app/blob/main/LICENSE)
[![Django](https://img.shields.io/badge/django-6.0-092E20.svg)](https://www.djangoproject.com/)

> **Looking for the Python package, CLI, or MCP server?** Those live in the sister repo: [`ericelizes/agentclip`](https://github.com/ericelizes/agentclip).

## Stack

- Django 6 + Django REST Framework
- Postgres in production, sqlite for local dev
- DigitalOcean Spaces for object storage (S3-compatible via `boto3` + `django-storages`)
- WhiteNoise for static files, gunicorn for WSGI
- `django-ratelimit` for per-IP rate limits

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

DJANGO_DEBUG=true python manage.py migrate
DJANGO_DEBUG=true python manage.py createsuperuser
DJANGO_DEBUG=true python manage.py runserver
```

- Home page: `http://localhost:8000/`
- Admin: `/admin/`
- Public clip viewer: `/s/<share_token>/`

## API

| Method | Path | Auth | Rate limit |
|---|---|---|---|
| POST | `/api/slideshow/` | none | 20 / hour / IP |
| POST | `/api/slideshow/<id>/slides/` | `Authorization: Bearer <write_token>` | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/slides/<position>/` | write_token | 200 / hour / IP |
| PATCH | `/api/slideshow/<id>/` | write_token | 60 / hour / IP |

The contract is documented end-to-end in the [agentclip](https://github.com/ericelizes/agentclip) Python package README. The Python tests there assert on these wire shapes; if you change a response, link the matching package PR.

## Deploy

### DigitalOcean App Platform (preferred)

```bash
# 1. Provision a managed Postgres in your DO account, save its DATABASE_URL.
# 2. Create a DO Space, generate keys, note the bucket name and endpoint.
# 3. From this repo:
doctl apps create --spec .do/app.yaml
# 4. In the App Platform UI, set the secrets marked SECRET in .do/app.yaml:
#    DJANGO_SECRET_KEY, DATABASE_URL, DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET
# 5. Add your domain in the Domains tab.
```

The Dockerfile runs `manage.py migrate` on every container start, so schema changes ship with the next deploy.

### Other Docker hosts

Any Docker-compatible platform works. Required env vars are listed in `.env.example`.

## Tests

```bash
DJANGO_DEBUG=true python manage.py test slideshows
```

20 integration tests covering API, auth, rate limit, and viewer. CI matrix runs Python 3.11/3.12/3.13 plus a Docker build on every PR.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The hard rules: mobile-first templates, atomic commits, no model names in user-facing copy, no em dashes.

## License

MIT. See [LICENSE](LICENSE).
