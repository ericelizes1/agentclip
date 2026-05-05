# agentclip-app

Django backend for [agentclip](https://github.com/ericelizes/agentclip): the API
and public viewer that turn agent QA runs into shareable slideshow URLs.

## Stack

- Django 6 + Django REST Framework
- Postgres (sqlite for local dev, zero-config)
- DigitalOcean Spaces for object storage (S3-compatible via boto3 + django-storages)
- WhiteNoise for static files
- django-ratelimit for basic bot protection

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The home page is at `http://localhost:8000/`. The admin is at `/admin/`.
Slideshows render at `/s/<share_token>/`.

## API surface

| Method | Path | Auth |
|---|---|---|
| POST | `/api/slideshow/` | none, rate-limited |
| POST | `/api/slideshow/<id>/slides/` | `Authorization: Bearer <write_token>` |
| PATCH | `/api/slideshow/<id>/slides/<position>/` | write_token |
| PATCH | `/api/slideshow/<id>/` | write_token |

Documented end-to-end in the [agentclip](https://github.com/ericelizes/agentclip)
public package README.

## Deploy

### DigitalOcean App Platform (preferred)

Single-service Docker deploy plus managed Postgres plus a Space for media.

1. Create a managed Postgres database in the same region (`nyc` works).
   Copy its connection string for `DATABASE_URL`.
2. Create a DigitalOcean Space in the same region. Generate an access
   key + secret. Note the bucket name and endpoint.
3. From this repo:
   ```bash
   doctl apps create --spec .do/app.yaml
   ```
4. In the App Platform UI, set the secret env vars marked `type: SECRET`
   in `.do/app.yaml`:
   - `DJANGO_SECRET_KEY` (generate via `python -c "import secrets; print(secrets.token_urlsafe(50))"`)
   - `DATABASE_URL` (from step 1)
   - `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_BUCKET` (from step 2)
5. Add your domain in the Domains tab (or use the auto-assigned `*.ondigitalocean.app` URL).

The Dockerfile runs `manage.py migrate` on every container start, so
schema changes ship with the next deploy with no manual step.

### Other Docker hosts

Any Docker-compatible platform works. Required env vars:

| Variable | Notes |
|---|---|
| `DJANGO_SECRET_KEY` | Required when `DJANGO_DEBUG=false` |
| `DJANGO_DEBUG=false` | Default in prod |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated, must include your domain |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://your-domain` |
| `DATABASE_URL` | Postgres URL |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` / `DO_SPACES_BUCKET` / `DO_SPACES_ENDPOINT` | Object storage |

See `.env.example` for the full list.
