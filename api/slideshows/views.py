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
)
from .serializers import (
    GallerySlideshowSerializer,
    SlideshowCreateSerializer,
    SlideshowPatchSerializer,
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


@api_view(['POST'])
@parser_classes([JSONParser])
@ratelimit(key=RATELIMIT_KEY_IP, rate=RATELIMIT_CREATE, method='POST', block=True)
def slideshow_create(request):
    '''Anonymous create. Returns id, share_url, write_token.

    The write_token is rendered exactly once, here. Losing it freezes
    the slideshow forever, which is why the SDK caches it locally
    immediately on the response.
    '''
    serializer = SlideshowCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    slideshow = serializer.save(created_ip=_client_ip(request))

    return Response(
        SlideshowCreateSerializer(slideshow, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


# ----- API: POST /api/slideshow/<id>/slides/ -----


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


# ----- Public: GET /api/v1/gallery/ -----


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
