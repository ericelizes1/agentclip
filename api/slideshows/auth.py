'''Bearer write_token authentication for slideshow mutations.

The hosted backend has no users in v1, so there is no Django auth
session to lean on. Every mutating endpoint instead pulls a Bearer
token from the Authorization header and resolves it against the
slideshow named in the URL.

Implementation note: this is a *permission* concern more than an
authentication one (we have no user to attach to ``request.user``),
but it lives in an auth module to keep DRF's mental model intact
and to keep the failure case ('401 invalid token') natural.

Constant-time comparison of secrets is used everywhere because
write_tokens are long-lived bearer credentials; even though we
look the slideshow up by primary key first, the token compare
should not leak timing information about how close the supplied
guess was to the real value.
'''

from __future__ import annotations

import secrets

from django.shortcuts import get_object_or_404
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated

from .models import Slideshow

AUTH_HEADER_PREFIX = 'Bearer '


class WriteTokenAuthentication(BaseAuthentication):
    '''Marker authentication class that announces the Bearer scheme.

    DRF emits HTTP 401 (with a WWW-Authenticate header) only when at
    least one ``authentication_classes`` is configured for the view.
    Without one, NotAuthenticated and AuthenticationFailed exceptions
    are downgraded to 403 because DRF doesn't know which scheme to
    advertise to the client.

    This class never actually authenticates anyone; it returns ``None``
    so DRF moves on. The real check happens in ``authorize_slideshow``,
    which can read the slideshow_id out of the URL and validate the
    token against the right row. We don't have enough URL context here.
    '''

    def authenticate(self, request) -> None:
        return None

    def authenticate_header(self, request) -> str:
        return 'Bearer'


def authorize_slideshow(request, slideshow_id) -> Slideshow:
    '''Resolve ``slideshow_id`` and verify the request's write_token.

    Raises:
    - 401 NotAuthenticated when no Authorization header is present
    - 401 AuthenticationFailed when the token does not match
    - 404 when the slideshow itself does not exist

    Returns the Slideshow instance on success so the caller can
    avoid a second database round-trip.
    '''
    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith(AUTH_HEADER_PREFIX):
        raise NotAuthenticated('missing Bearer token')
    supplied = header[len(AUTH_HEADER_PREFIX):].strip()
    if not supplied:
        raise NotAuthenticated('empty Bearer token')

    slideshow = get_object_or_404(Slideshow, pk=slideshow_id)

    if not secrets.compare_digest(supplied, slideshow.write_token):
        raise AuthenticationFailed('invalid write_token for this slideshow')
    return slideshow


def authorize_edit(request, share_token: str) -> Slideshow:
    '''Verify the request's Bearer edit_token against the named slideshow.

    Mirrors ``authorize_slideshow``, but resolves by ``share_token`` (the
    URL-safe slug the edit page receives) and compares against the
    slideshow's ``edit_token`` instead of ``write_token``. Used by the
    edit-page mutating endpoints under /api/v1/slideshow/<slug>/slides/.

    Raises:
    - 401 NotAuthenticated when no Authorization header is present
    - 401 AuthenticationFailed when the token does not match
    - 404 when the slideshow itself does not exist
    '''
    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith(AUTH_HEADER_PREFIX):
        raise NotAuthenticated('missing Bearer token')
    supplied = header[len(AUTH_HEADER_PREFIX):].strip()
    if not supplied:
        raise NotAuthenticated('empty Bearer token')

    slideshow = get_object_or_404(Slideshow, share_token=share_token)

    if not secrets.compare_digest(supplied, slideshow.edit_token):
        raise AuthenticationFailed('invalid edit_token for this slideshow')
    return slideshow


class WriteTokenAuthenticationScheme(OpenApiAuthenticationExtension):
    '''Tells drf-spectacular how to render WriteTokenAuthentication in OpenAPI.

    Without this extension spectacular emits a warning and omits the
    Bearer security scheme from the schema, which the typed web client
    then can't see. Mapping it to the standard HTTP Bearer scheme keeps
    the generated TS reflecting the actual wire contract.
    '''

    target_class = 'slideshows.auth.WriteTokenAuthentication'
    name = 'WriteTokenAuth'

    def get_security_definition(self, auto_schema):  # noqa: ARG002 — DRF API
        return {
            'type': 'http',
            'scheme': 'bearer',
            'description': (
                'Per-slideshow write_token returned by `POST /api/slideshow/`. '
                'The server keeps no user accounts; the token IS the credential.'
            ),
        }
