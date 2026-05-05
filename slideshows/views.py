'''Views for the slideshow API and the public viewer.

API surface (under /api/):
- POST   /api/slideshow/                          create
- POST   /api/slideshow/<id>/slides/              add slide
- PATCH  /api/slideshow/<id>/slides/<position>/   update slide
- PATCH  /api/slideshow/<id>/                     patch slideshow

Public surface:
- GET    /                                        landing page
- GET    /s/<share_token>/                        viewer

Each API view is a function-based DRF view rather than a ViewSet
because the four endpoints don't share enough behavior to benefit
from a router. Function views also keep the auth wiring
(``authorize_slideshow``) explicit at every call site, which is the
right tradeoff for credential-bearing endpoints.

The two read-only endpoints (the viewer and the home page) live here
too, even though they're plain Django views; separating 'public read'
from 'public write' across modules adds navigation cost without
buying any encapsulation at this scale.
'''

from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404, render
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
)
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response

from .auth import WriteTokenAuthentication, authorize_slideshow
from .models import Slide, Slideshow
from .serializers import (
    SlideshowCreateSerializer,
    SlideshowPatchSerializer,
    SlideWriteSerializer,
)

# Curated list of share_tokens that render in the home-page gallery.
# Updated in place rather than database-backed; gallery items are an
# editorial decision, not user content.
_GALLERY_TOKENS: tuple[str, ...] = ()


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
def slide_add(request, slideshow_id):
    '''Append a slide. Auth: Bearer <write_token>.

    Position is server-assigned as max(existing) + 1. The unique
    constraint on (slideshow, position) is the safety net under
    concurrent appends; we read with ``select_for_update`` to keep
    the increment atomic in the common case.
    '''
    slideshow = authorize_slideshow(request, slideshow_id)

    if 'image' not in request.FILES:
        return Response({'image': ['this field is required.']}, status=400)

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
        slide = serializer.save(slideshow=slideshow, position=next_position)

    return Response(
        SlideWriteSerializer(slide, context={'request': request}).data,
        status=status.HTTP_201_CREATED,
    )


# ----- API: PATCH /api/slideshow/<id>/slides/<position>/ -----


@api_view(['PATCH'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([MultiPartParser, JSONParser])
def slide_update(request, slideshow_id, position):
    '''Replace image and/or caption. Auth: Bearer <write_token>.'''
    slideshow = authorize_slideshow(request, slideshow_id)
    slide = get_object_or_404(Slide, slideshow=slideshow, position=position)

    serializer = SlideWriteSerializer(
        slide, data=request.data, partial=True, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ----- API: PATCH /api/slideshow/<id>/ -----


@api_view(['PATCH'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([JSONParser])
def slideshow_patch(request, slideshow_id):
    '''Patch title, description, or summary. Auth: Bearer <write_token>.'''
    slideshow = authorize_slideshow(request, slideshow_id)

    serializer = SlideshowPatchSerializer(slideshow, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ----- Public: GET /s/<share_token>/ -----


def slideshow_viewer(request, share_token):
    '''Public, unauthenticated viewer. Renders the slideshow as HTML.'''
    slideshow = get_object_or_404(
        Slideshow.objects.prefetch_related('slides'), share_token=share_token
    )
    return render(
        request,
        'slideshows/viewer.html',
        {'slideshow': slideshow, 'slides': list(slideshow.slides.all())},
    )


# ----- Public: GET / -----


def home(request):
    '''Landing page with hero, install snippet, and curated gallery.'''
    gallery = list(
        Slideshow.objects.filter(share_token__in=_GALLERY_TOKENS).prefetch_related('slides')
    )
    by_token = {s.share_token: s for s in gallery}
    ordered = [by_token[t] for t in _GALLERY_TOKENS if t in by_token]
    return render(request, 'slideshows/home.html', {'gallery': ordered})
