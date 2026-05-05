# qagent-app

Django backend for [qagent](https://github.com/ericelizes/qagent): the API
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

Documented end-to-end in the [qagent](https://github.com/ericelizes/qagent)
public package README.

## Deploy

- DigitalOcean App Platform via `.do/app.yaml` (preferred)
- Or any Docker host via the included `Dockerfile`

Required env vars in production: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`,
`DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`,
`DO_SPACES_BUCKET`, `DO_SPACES_ENDPOINT`. See `.env.example` for the full
list.
