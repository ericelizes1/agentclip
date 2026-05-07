'''Eager-load the Celery app so ``celery -A agentclip_app worker`` finds it.

Re-exporting ``celery_app`` here is the canonical Celery+Django pattern.
Without it, ``shared_task`` decorators in ``slideshows/tasks.py`` would
attach to the default Celery app instead of ours.
'''

from __future__ import annotations

from .celery import app as celery_app


__all__ = ('celery_app',)
