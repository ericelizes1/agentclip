# Single-service container for agentclip.
#
# Boring on purpose: one stage, one CMD, no nginx sidecar (WhiteNoise
# serves static files in-process). Fly.io handles the front door
# (TLS, regional edges, X-Forwarded-For); we run gunicorn behind it.
#
# Build: docker build -t agentclip .
# Run:   docker run -p 8000:8000 --env-file .env agentclip

FROM python:3.12-slim

# System deps: psycopg needs libpq, Pillow needs libjpeg/zlib, gunicorn
# is pure Python. curl stays for healthchecks; everything else can go.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        libjpeg62-turbo \
        zlib1g \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# collectstatic runs at build time so the image ships with hashed
# static assets ready for WhiteNoise. STATIC_ROOT is created here.
# A dummy SECRET_KEY keeps the prod-safety check in settings.py
# from refusing to load during the build.
RUN DJANGO_DEBUG=true python manage.py collectstatic --noinput

EXPOSE 8000

# Healthcheck hits the OpenAPI schema — it's the cheapest always-200
# route the API exposes after the monorepo pivot (the old `/` template
# moved to web/). A failure means the app is wedged.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS -H 'Accept: application/json' http://127.0.0.1:8000/api/schema/ -o /dev/null || exit 1

# `sh -c` so $PORT expansion works under platforms that override it.
# Two workers is right for a $5-12/mo droplet; raise as needed.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn agentclip_app.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 60 --access-logfile - --error-logfile -"]
