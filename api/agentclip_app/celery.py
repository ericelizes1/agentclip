'''Celery app definition for AgentClip.

Single queue (``renders``) for MP4/PDF render jobs. Broker is the same
Redis URL the rest of the app uses (rate limits, future caching). When
``REDIS_URL`` is unset, ``task_always_eager`` runs tasks synchronously
in-process — local dev and the test suite need no broker, no worker.

The Celery app is imported by ``agentclip_app/__init__.py`` so the
``celery -A agentclip_app worker`` invocation in fly.toml finds it
without explicit module gymnastics.
'''

from __future__ import annotations

import os

from celery import Celery


# Django must be importable; ensure DJANGO_SETTINGS_MODULE is set before
# the Celery app autodiscovers tasks (which imports each app's tasks.py
# under Django's app machinery).
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agentclip_app.settings')

app = Celery('agentclip')

# Pull all CELERY_* config off Django settings. Keeps a single source
# of truth and avoids duplicating broker URL / queue config in two
# files.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-load tasks.py from each INSTALLED_APP. The slideshows app's
# tasks live at slideshows/tasks.py.
app.autodiscover_tasks()
