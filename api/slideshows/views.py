'''Views for the slideshow API.

API surface:
- POST   /api/slideshow/                          create
- POST   /api/slideshow/<id>/slides/              add slide
- PATCH  /api/slideshow/<id>/slides/<position>/   update slide
- PATCH  /api/slideshow/<id>/                     patch slideshow
- GET    /api/v1/gallery/                         curated home gallery

Each API view is a function-based DRF view rather than a ViewSet
because the four mutating endpoints don't share enough behavior to
benefit from a router. Function views also keep the auth wiring
(``authorize_slideshow``) explicit at every call site, which is the
right tradeoff for credential-bearing endpoints. The gallery
endpoint, being a read-only list with no auth, uses a plain
generics.ListAPIView.

The public-facing viewer and home page used to live here as Django
template views; both moved to the Next.js web/ service in the
monorepo pivot. This module is API-only now.
'''

from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
)
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response

from .auth import WriteTokenAuthentication, authorize_slideshow
from .models import (
    ALLOWED_IMAGE_TYPES,
    ALLOWED_MEDIA_TYPES,
    MAX_MEDIA_BYTES,
    MediaKind,
    Slide,
    Slideshow,
    hash_write_token,
)
from .serializers import (
    EditTokenSerializer,
    GallerySlideshowSerializer,
    SlideshowCreateSerializer,
    SlideshowPatchSerializer,
    SlideshowPublicSerializer,
    SlideWriteSerializer,
)


def _validate_media_upload(uploaded):
    '''Validate an incoming media upload and classify it as image or video.

    Returns (media_kind, content_type). Raises ValueError with a
    user-readable message on rejection so callers translate to 400.
    '''
    if uploaded.size > MAX_MEDIA_BYTES:
        raise ValueError(
            f'media file too large ({uploaded.size} bytes); '
            f'max is {MAX_MEDIA_BYTES // (1024 * 1024)}MB.'
        )
    content_type = (uploaded.content_type or '').lower()
    if content_type not in ALLOWED_MEDIA_TYPES:
        raise ValueError(
            f'unsupported media type {content_type!r}. '
            f'allowed: {sorted(ALLOWED_MEDIA_TYPES)}.'
        )
    kind = MediaKind.IMAGE if content_type in ALLOWED_IMAGE_TYPES else MediaKind.VIDEO
    return kind, content_type

# Per-IP rate limits per the handoff. Picked to be generous for
# legitimate agent runs (200 slides/hour means a slide every 18s,
# well above any realistic agent throughput) while still blocking
# the obvious abuse cases of "scriptkiddie hammers create endpoint
# to seed garbage". block=True returns the standard 429 response.
RATELIMIT_KEY_IP = 'ip'
RATELIMIT_CREATE = '20/h'
RATELIMIT_SLIDE_WRITE = '200/h'
RATELIMIT_PATCH = '60/h'

def _client_ip(request) -> str | None:
    '''Best-effort client IP, honoring X-Forwarded-For when present.

    DigitalOcean App Platform sets X-Forwarded-For to the real client
    IP. REMOTE_ADDR alone would record the platform's edge proxy,
    which is useless for abuse forensics.
    '''
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# ----- API: POST /api/slideshow/ -----


@extend_schema(
    request=SlideshowCreateSerializer,
    responses={201: SlideshowCreateSerializer},
    tags=['slideshows'],
)
@api_view(['POST'])
@parser_classes([JSONParser])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_CREATE, method='POST', block=True)
def slideshow_create(request):
    '''Anonymous create. Returns id, share_url, write_token, edit_url.

    The write_token is rendered exactly once, here. Losing it freezes
    the slideshow forever, which is why the SDK caches it locally
    immediately on the response.

    The edit_url is also rendered exactly once at create time. Lost
    edit_urls can be recovered through GET /api/v1/slideshow/<slug>/
    edit-token/ as long as the caller still has the write_token. The
    SHA-256 hash of the supplied write_token is stamped onto the row
    here as the ownership credential the recovery endpoint compares
    against.
    '''
    serializer = SlideshowCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    slideshow = serializer.save(created_ip=_client_ip(request))

    # Stamp the ownership hash so the creator can recover the edit_url
    # later via the recovery endpoint. This is one extra UPDATE; we don't
    # care about the round-trip cost on a create path that already does
    # several writes.
    slideshow.created_by_token_hash = hash_write_token(slideshow.write_token)
    slideshow.save(update_fields=['created_by_token_hash'])

    return Response(
        SlideshowCreateSerializer(slideshow, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


# ----- API: POST /api/slideshow/<id>/slides/ -----


@extend_schema(
    request=SlideWriteSerializer,
    responses={201: SlideWriteSerializer},
    tags=['slides'],
)
@api_view(['POST'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([MultiPartParser, JSONParser])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_SLIDE_WRITE, method='POST', block=True)
def slide_add(request, slideshow_id):
    '''Append a slide. Auth: Bearer <write_token>.

    Position is server-assigned as max(existing) + 1. The unique
    constraint on (slideshow, position) is the safety net under
    concurrent appends; we read with ``select_for_update`` to keep
    the increment atomic in the common case.
    '''
    slideshow = authorize_slideshow(request, slideshow_id)

    if 'media' not in request.FILES:
        return Response({'media': ['this field is required.']}, status=400)

    try:
        kind, content_type = _validate_media_upload(request.FILES['media'])
    except ValueError as exc:
        return Response({'media': [str(exc)]}, status=400)

    serializer = SlideWriteSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        last = (
            Slide.objects.select_for_update()
            .filter(slideshow=slideshow)
            .order_by('-position')
            .first()
        )
        next_position = (last.position + 1) if last else 1
        slide = serializer.save(
            slideshow=slideshow,
            position=next_position,
            media_kind=kind,
            media_content_type=content_type,
        )

    return Response(
        SlideWriteSerializer(slide, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


# ----- API: PATCH /api/slideshow/<id>/slides/<position>/ -----


@extend_schema(
    request=SlideWriteSerializer,
    responses={200: SlideWriteSerializer},
    tags=['slides'],
)
@api_view(['PATCH'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([MultiPartParser, JSONParser])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_SLIDE_WRITE, method='PATCH', block=True)
def slide_update(request, slideshow_id, position):
    '''Replace image and/or caption. Auth: Bearer <write_token>.'''
    slideshow = authorize_slideshow(request, slideshow_id)
    slide = get_object_or_404(Slide, slideshow=slideshow, position=position)

    # If a new media file came in, classify it before we let the serializer
    # save. Caption-only updates skip this whole branch and stay JSON.
    extra_save = {}
    if 'media' in request.FILES:
        try:
            kind, content_type = _validate_media_upload(request.FILES['media'])
        except ValueError as exc:
            return Response({'media': [str(exc)]}, status=400)
        extra_save['media_kind'] = kind
        extra_save['media_content_type'] = content_type

    serializer = SlideWriteSerializer(
        slide, data=request.data, partial=True, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(**extra_save)
    return Response(serializer.data)


# ----- API: PATCH /api/slideshow/<id>/ -----


@extend_schema(
    request=SlideshowPatchSerializer,
    responses={200: SlideshowPatchSerializer},
    tags=['slideshows'],
)
@api_view(['PATCH'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([JSONParser])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_PATCH, method='PATCH', block=True)
def slideshow_patch(request, slideshow_id):
    '''Patch title, description, or summary. Auth: Bearer <write_token>.'''
    slideshow = authorize_slideshow(request, slideshow_id)

    serializer = SlideshowPatchSerializer(slideshow, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ----- Edit token recovery + rotation -----


def _verify_creator(request, slideshow: Slideshow) -> None:
    '''Confirm the request's Bearer write_token created this slideshow.

    Status codes follow standard HTTP semantics:
    - 401 NotAuthenticated when no Bearer header is present (the
      caller hasn't tried to authenticate; advertise the scheme)
    - 403 PermissionDenied when a token IS supplied but doesn't match
      the row's stored hash (caller authenticated, just isn't this
      slideshow's creator)

    Pre-edit_token rows have an empty `created_by_token_hash`; those
    can never authenticate via this path (the hash compare returns
    False against the empty string), so they get 403 — the legacy
    creator can't recover an edit URL through the API and must
    re-create the slideshow.
    '''
    from rest_framework.exceptions import NotAuthenticated, PermissionDenied
    from .auth import AUTH_HEADER_PREFIX
    import secrets as _secrets

    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith(AUTH_HEADER_PREFIX):
        raise NotAuthenticated('missing Bearer token')
    supplied = header[len(AUTH_HEADER_PREFIX):].strip()
    if not supplied:
        raise NotAuthenticated('empty Bearer token')

    expected_hash = slideshow.created_by_token_hash
    if not expected_hash:
        # Legacy row created before created_by_token_hash existed.
        # No way to verify ownership — fail closed with 403.
        raise PermissionDenied(
            'this slideshow predates edit-token recovery; cannot verify ownership'
        )
    supplied_hash = hash_write_token(supplied)
    if not _secrets.compare_digest(supplied_hash, expected_hash):
        raise PermissionDenied('write_token does not match this slideshow')


def _edit_url(slideshow: Slideshow, request) -> str:
    '''Build the public edit URL with the edit_token in the query string.

    Format: /s/<share_token>/edit?t=<edit_token>. Absolute when
    request context allows; relative otherwise (server-side use).
    '''
    path = f'/s/{slideshow.share_token}/edit?t={slideshow.edit_token}'
    if request is not None:
        return request.build_absolute_uri(path)
    return path


@extend_schema(
    responses={200: EditTokenSerializer},
    tags=['edit-token'],
)
@api_view(['GET'])
@authentication_classes([WriteTokenAuthentication])
def edit_token_recover(request, share_token):
    '''Return the edit_token + edit_url for callers who can prove ownership.

    Authentication: Bearer <write_token>. The supplied token's SHA-256
    must match `created_by_token_hash` on the row. 401 when the header
    is missing/empty; 403 when the token doesn't match; 404 when the
    slug is unknown.
    '''
    slideshow = get_object_or_404(Slideshow, share_token=share_token)
    _verify_creator(request, slideshow)

    return Response({
        'edit_token': slideshow.edit_token,
        'edit_url': _edit_url(slideshow, request),
    })


@extend_schema(
    request=None,
    responses={200: EditTokenSerializer},
    tags=['edit-token'],
)
@api_view(['POST'])
@authentication_classes([WriteTokenAuthentication])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_PATCH, method='POST', block=True)
def edit_token_rotate(request, share_token):
    '''Regenerate the edit_token. The old URL stops working immediately.

    Authentication: same ownership check as the recovery endpoint. The
    new edit_token is generated server-side; the response shape mirrors
    the recovery endpoint so SDK callers can use the same parser.
    '''
    slideshow = get_object_or_404(Slideshow, share_token=share_token)
    _verify_creator(request, slideshow)

    # secrets.token_urlsafe via the model's helper keeps the entropy
    # consistent with the original creation default.
    from .models import _edit_token as _new_edit_token
    slideshow.edit_token = _new_edit_token()
    slideshow.save(update_fields=['edit_token'])

    return Response({
        'edit_token': slideshow.edit_token,
        'edit_url': _edit_url(slideshow, request),
    })


# ----- Public: GET /api/v1/gallery/ -----


class SlideshowPublicView(generics.RetrieveAPIView):
    '''Public read of one slideshow by share_token.

    Replaces the deleted Django template view. Anonymous, unauthenticated,
    rate-limit-free (read-only — abuse vectors are the same as a CDN
    fetch). The Next.js viewer page (`/s/[token]`) calls this endpoint
    via the typed client; agents and integrations are welcome to too.

    Returns 200 with `SlideshowPublicSerializer` on hit, 404 on miss.
    Slides are prefetched in position order so the response renders in
    one query.
    '''

    serializer_class = SlideshowPublicSerializer
    queryset = Slideshow.objects.prefetch_related('slides')
    lookup_field = 'share_token'


class GalleryListView(generics.ListAPIView):
    '''Curated gallery feed for the home page.

    Returns slideshows with `is_gallery=True`, ordered by
    `gallery_position` ascending then `-created_at`. Capped at a sane
    upper bound so a misconfigured admin entry can't blow up the
    payload.

    Public, unauthenticated, rate-limited per the same throttling as
    the rest of the API.
    '''

    serializer_class = GallerySlideshowSerializer
    pagination_class = None
    queryset = (
        Slideshow.objects
        .filter(is_gallery=True)
        .order_by('gallery_position', '-created_at')
        .prefetch_related('slides')[:12]
    )
