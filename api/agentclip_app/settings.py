'''Django settings for the agentclip backend.

Single-file settings driven by environment variables, the same way
the deploy target (DigitalOcean App Platform) wants them. There is
no settings/dev.py vs settings/prod.py split because every difference
between environments collapses cleanly into env vars, and the split
adds more cognitive load than it removes for a one-service app.

Conventions:
- Booleans come from env via ``_envbool`` so '1', 'true', and 'yes'
  all work; defaults are documented inline.
- Required-in-prod-only settings (SECRET_KEY, Spaces creds) are
  optional in DEBUG and loud on misconfiguration in prod.
'''

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def _envbool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


DEBUG = _envbool('DJANGO_DEBUG', default=False)

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    # Local-dev fallback. Refuses to load in prod via the assertion below.
    'dev-only-secret-key-do-not-use-in-production',
)
if not DEBUG and SECRET_KEY.startswith('dev-only'):
    raise RuntimeError(
        'DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false. '
        'Refusing to start with the dev fallback in production.'
    )

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()]
if DEBUG and not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
]


INSTALLED_APPS = [
    # django-unfold replaces the default admin theme. Must be listed
    # BEFORE django.contrib.admin so its template overrides win the
    # template-loader race.
    'unfold',
    'unfold.contrib.filters',  # nicer dropdown/date filters in the changelist

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'storages',

    'slideshows',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves collected static files in production without nginx.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'agentclip_app.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'agentclip_app.wsgi.application'


# ----- Database -----

# Postgres in prod via DATABASE_URL-style env, sqlite for local dev so
# `python manage.py migrate` works zero-config when cloning.
if os.environ.get('DATABASE_URL'):
    # Lightweight URL parser keeps us off dj-database-url as a dep.
    from urllib.parse import urlparse

    parsed = urlparse(os.environ['DATABASE_URL'])
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': parsed.password or '',
            'HOST': parsed.hostname or '',
            'PORT': str(parsed.port or ''),
            'CONN_MAX_AGE': 60,
            'OPTIONS': {'sslmode': os.environ.get('DJANGO_DB_SSLMODE', 'require')},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ----- Static files -----

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ----- Object storage (DigitalOcean Spaces, S3-compatible) -----

# When DO_SPACES_KEY is set we route uploaded media to Spaces; otherwise
# we fall back to local FileSystemStorage so `manage.py runserver` works
# out of the box for contributors who haven't set up Spaces.
if os.environ.get('DO_SPACES_KEY'):
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
        },
    }
    AWS_ACCESS_KEY_ID = os.environ['DO_SPACES_KEY']
    AWS_SECRET_ACCESS_KEY = os.environ['DO_SPACES_SECRET']
    AWS_STORAGE_BUCKET_NAME = os.environ['DO_SPACES_BUCKET']
    AWS_S3_ENDPOINT_URL = os.environ['DO_SPACES_ENDPOINT']
    AWS_S3_REGION_NAME = os.environ.get('DO_SPACES_REGION', 'nyc3')
    AWS_S3_ADDRESSING_STYLE = 'virtual'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    # Custom domain (e.g. cdn.agentclip.dev pointing at Spaces CDN) lets us
    # serve images under our own URL space without exposing the
    # digitaloceanspaces.com hostname to slideshow viewers.
    if os.environ.get('DO_SPACES_CUSTOM_DOMAIN'):
        AWS_S3_CUSTOM_DOMAIN = os.environ['DO_SPACES_CUSTOM_DOMAIN']
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'


# ----- DRF -----

REST_FRAMEWORK = {
    # Anonymous access is the default; per-endpoint auth is enforced via
    # the WriteTokenAuthentication class plumbed in slideshows.views.
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    # Convert django-ratelimit's Ratelimited (a PermissionDenied subclass)
    # into HTTP 429 instead of the default 403.
    'EXCEPTION_HANDLER': 'slideshows.exceptions.exception_handler',
}


# ----- Defaults -----

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ----- Admin polish (django-unfold) -----
#
# Replaces Django's default admin theme. The admin IS AgentClip's
# operator dashboard for v1 (no separate analytics or moderation UI),
# so it deserves to look like a 2026 product rather than 2010 Django.
#
# Color palette mirrors the vermillion ramp in web/lib/tokens.ts so
# the admin reads as visually continuous with agentclip.dev and
# docs.agentclip.dev. Material Symbol "movie" is the closest standard
# icon match to the AgentClip ticket-mark logo.

UNFOLD = {
    'SITE_TITLE': 'AgentClip Admin',
    'SITE_HEADER': 'AgentClip',
    'SITE_SYMBOL': 'movie',
    'SHOW_HISTORY': True,
    'SHOW_VIEW_ON_SITE': True,
    'COLORS': {
        # RGB triplets; Unfold composes them into CSS variables that
        # cascade to every admin component. Values come from the
        # vermillion ramp in the design tokens.
        'primary': {
            '50':  '253 240 235',  # vermillion-50  (#fdf0eb)
            '100': '250 220 208',  # vermillion-100 (#fadcd0)
            '200': '245 181 154',  # interpolated
            '300': '240 138 106',  # vermillion-300 (#f08a6a)
            '400': '229 105 71',   # interpolated
            '500': '217 72 36',    # vermillion-500 (#d94824) — primary
            '600': '183 58 26',    # vermillion-600 (#b73a1a)
            '700': '147 40 27',    # vermillion-700 (#93281b)
            '800': '119 26 20',    # interpolated
            '900': '77 16 12',     # interpolated
        },
    },
}


# ----- Production hardening -----

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = _envbool('DJANGO_SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_SECURE_HSTS_SECONDS', '0'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
    SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0
