'''Custom DRF exception handler.

The only reason this module exists is to convert django-ratelimit's
``Ratelimited`` exception into an HTTP 429 (Too Many Requests).

By default ``Ratelimited`` subclasses ``PermissionDenied``, which DRF's
default exception handler maps to 403. That's wrong: a rate-limit hit
is not "you're forbidden from doing this", it's "you're going too fast,
back off". 429 is the right code, and clients respect it differently
(retry with backoff vs treat-as-permanent).

The handler delegates everything else to DRF's default so we don't
accidentally swallow other exceptions.
'''

from __future__ import annotations

from django_ratelimit.exceptions import Ratelimited
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, Ratelimited):
        return Response(
            {'detail': 'too many requests; back off and retry later.'},
            status=429,
        )
    return drf_exception_handler(exc, context)
