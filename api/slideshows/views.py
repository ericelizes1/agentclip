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

from django.db import models, transaction
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

from .auth import (
    AdminTokenAuthentication,
    WriteTokenAuthentication,
    authorize_admin,
    authorize_edit,
    authorize_slideshow,
)
from .models import (
    ALLOWED_IMAGE_TYPES,
    ALLOWED_MEDIA_TYPES,
    MAX_BYTES_PER_SLIDESHOW,
    MAX_MEDIA_BYTES,
    MAX_SLIDES_PER_SLIDESHOW,
    MediaKind,
    Slide,
    Slideshow,
    hash_write_token,
)
from .serializers import (
    EditTokenSerializer,
    GallerySlideshowSerializer,
    SlideCaptionEditSerializer,
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
#
# `RATELIMIT_KEY` points at our trusted-proxy-aware key function in
# slideshows.ratelimit. Without that, django-ratelimit's default
# `key='ip'` reads REMOTE_ADDR, which behind Cloudflare/Fly is a
# constant edge IP — meaning all traffic shares one bucket and the
# limits become useless. See slideshows/ratelimit.py for the trust
# hierarchy.
RATELIMIT_KEY = 'slideshows.ratelimit.client_ip_key'
RATELIMIT_CREATE = '20/h'
RATELIMIT_SLIDE_WRITE = '200/h'
RATELIMIT_PATCH = '60/h'

# Forensics + abuse logging share the same hierarchy as the rate-
# limit key, so the audit log and the counter agree on identity.
from .ratelimit import client_ip as _client_ip  # noqa: E402


# ----- API: POST /api/slideshow/ -----


@extend_schema(
    request=SlideshowCreateSerializer,
    responses={201: SlideshowCreateSerializer},
    tags=['slideshows'],
)
@api_view(['POST'])
@parser_classes([JSONParser])
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_CREATE, method='POST', block=True)
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
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_SLIDE_WRITE, method='POST', block=True)
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

    upload = request.FILES['media']
    new_bytes = upload.size

    # Per-slideshow ceilings. Both checks happen BEFORE we open the
    # transaction so a misconfigured client gets a clean 400 without
    # locking any rows. A racing concurrent add is bounded by the
    # ratelimit + the size of the gap between this read and the save;
    # in the worst case we accept one extra slide past the cap, which
    # is fine for a v0.1 advisory limit.
    from django.db.models import Sum
    existing = Slide.objects.filter(slideshow=slideshow).aggregate(
        count=models.Count('id'),
        total_bytes=Sum('media_bytes'),
    )
    if (existing['count'] or 0) >= MAX_SLIDES_PER_SLIDESHOW:
        return Response(
            {'detail': (
                f'this slideshow already has the maximum '
                f'{MAX_SLIDES_PER_SLIDESHOW} slides. v0.1 caps slideshows at '
                f'{MAX_SLIDES_PER_SLIDESHOW} clips; longer runs are a v0.2 '
                f'feature (see github.com/ericelizes1/agentclip — collections).'
            )},
            status=400,
        )
    if (existing['total_bytes'] or 0) + new_bytes > MAX_BYTES_PER_SLIDESHOW:
        mb_cap = MAX_BYTES_PER_SLIDESHOW // (1024 * 1024)
        return Response(
            {'detail': (
                f'this slide would push the slideshow past the {mb_cap}MB '
                f'total-size cap. delete or shrink existing slides, or '
                f'start a fresh slideshow.'
            )},
            status=400,
        )

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
            media_bytes=new_bytes,
        )
        # Adding a slide invalidates any previously rendered artifacts.
        # on_commit defers the FileField file deletes until the row write
        # has actually committed, so a rolled-back transaction can't leak
        # storage deletes.
        transaction.on_commit(slideshow.bump_render_version)

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
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_SLIDE_WRITE, method='PATCH', block=True)
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

        # Replacing media: enforce the per-slideshow byte cap against the
        # delta. Subtracts the existing slide's bytes (which are about to
        # be replaced) and adds the incoming size.
        new_bytes = request.FILES['media'].size
        from django.db.models import Sum
        other_total = Slide.objects.filter(slideshow=slideshow).exclude(
            pk=slide.pk
        ).aggregate(total=Sum('media_bytes'))['total'] or 0
        if other_total + new_bytes > MAX_BYTES_PER_SLIDESHOW:
            mb_cap = MAX_BYTES_PER_SLIDESHOW // (1024 * 1024)
            return Response(
                {'detail': (
                    f'replacing this slide would push the slideshow past the '
                    f'{mb_cap}MB total-size cap.'
                )},
                status=400,
            )

        extra_save['media_kind'] = kind
        extra_save['media_content_type'] = content_type
        extra_save['media_bytes'] = new_bytes

    serializer = SlideWriteSerializer(
        slide, data=request.data, partial=True, context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(**extra_save)
    transaction.on_commit(slideshow.bump_render_version)
    return Response(serializer.data)


# ----- API: PATCH /api/slideshow/<id>/ -----


@extend_schema(
    request=SlideshowPatchSerializer,
    responses={200: SlideshowPatchSerializer, 204: None},
    tags=['slideshows'],
)
@api_view(['PATCH', 'DELETE'])
@authentication_classes([WriteTokenAuthentication])
@parser_classes([JSONParser])
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_PATCH, method='PATCH', block=True)
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_PATCH, method='DELETE', block=True)
def slideshow_detail(request, slideshow_id):
    '''PATCH title/description/summary or DELETE the whole slideshow.

    Auth: Bearer <write_token>. DELETE cascades to all slides via the
    Slide.slideshow FK; the underlying R2 objects are NOT cleaned up
    here (django-storages doesn't delete files on model.delete by
    default), so empty bucket cruft accumulates. Acceptable for v0.1
    with low traffic; revisit when storage costs matter.
    '''
    slideshow = authorize_slideshow(request, slideshow_id)

    if request.method == 'DELETE':
        slideshow.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SlideshowPatchSerializer(slideshow, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    # Bump the render version only when a render-affecting field is in
    # the patch body. Title/description show up on the PDF cover and in
    # OG meta; summary appears on the cover card. A no-op PATCH (or one
    # touching only fields that don't surface in renders) does not
    # invalidate, to avoid pre-warm spam from clients that issue PATCHes
    # for unrelated reasons.
    rendered_fields = {'title', 'description', 'summary'}
    invalidates = bool(rendered_fields & set(serializer.validated_data.keys()))
    serializer.save()
    if invalidates:
        transaction.on_commit(slideshow.bump_render_version)
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

    Honors AGENTCLIP_PUBLIC_BASE_URL so the URL points at the user-facing
    host even when the API is reached through an internal hostname.
    '''
    from .serializers import _build_absolute
    return _build_absolute(
        f'/s/{slideshow.share_token}/edit?t={slideshow.edit_token}',
        request,
    )


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
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_PATCH, method='POST', block=True)
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


# ----- Edit-page mutations: caption-only PATCH + slide DELETE -----
#
# Authenticated by the per-slideshow edit_token rather than the
# write_token. Surface is intentionally narrower than the SDK's
# write_token endpoints — captions and deletions only, no media
# replacement, no slideshow metadata edits. The edit-page UI
# (web/app/s/[token]/edit/) is the only intended consumer.


@extend_schema(
    request=SlideCaptionEditSerializer,
    responses={200: SlideWriteSerializer},
    tags=['edit-token'],
)
@api_view(['PATCH'])
@authentication_classes([WriteTokenAuthentication])
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_SLIDE_WRITE, method='PATCH', block=True)
def slide_edit_caption(request, share_token, position):
    '''Edit a slide's caption via the edit_token. Auth: Bearer <edit_token>.'''
    slideshow = authorize_edit(request, share_token)
    slide = get_object_or_404(Slide, slideshow=slideshow, position=position)

    body = SlideCaptionEditSerializer(data=request.data)
    body.is_valid(raise_exception=True)
    slide.caption = body.validated_data['caption']
    slide.save(update_fields=['caption'])
    transaction.on_commit(slideshow.bump_render_version)

    return Response(
        SlideWriteSerializer(slide, context={'request': request}).data,
    )


@extend_schema(
    responses={204: None},
    tags=['edit-token'],
)
@api_view(['DELETE'])
@authentication_classes([WriteTokenAuthentication])
@ratelimit(key=RATELIMIT_KEY, rate=RATELIMIT_SLIDE_WRITE, method='DELETE', block=True)
def slide_edit_delete(request, share_token, position):
    '''Delete a slide via the edit_token. Auth: Bearer <edit_token>.

    Positions of remaining slides are NOT renumbered — the gap is
    preserved so existing public links to higher-numbered positions
    stay valid as long as those slides exist. Renumbering on delete
    would silently rewrite shareable URLs.
    '''
    slideshow = authorize_edit(request, share_token)
    slide = get_object_or_404(Slide, slideshow=slideshow, position=position)
    slide.delete()
    transaction.on_commit(slideshow.bump_render_version)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ----- Admin: feature/unfeature a slideshow in the gallery -----


@extend_schema(
    request={
        'type': 'object',
        'properties': {
            'position': {
                'type': 'integer',
                'description': 'gallery_position to assign; lower sorts first.',
            },
        },
    },
    responses={200: SlideshowPublicSerializer, 204: None},
    tags=['admin'],
)
@api_view(['POST', 'DELETE'])
@authentication_classes([AdminTokenAuthentication])
def slideshow_feature(request, share_token):
    '''Flip is_gallery on a slideshow. Auth: Bearer AGENTCLIP_ADMIN_TOKEN.

    POST   {position?: int} → set is_gallery=True, gallery_position=<position>
    DELETE                  → set is_gallery=False (drops from gallery)

    The slideshow row is the source of truth for curation. Calling
    POST repeatedly with different positions is the supported way to
    reorder. POST is idempotent in the is_gallery sense — calling it
    twice on a featured slideshow is fine; the second call updates
    the position.
    '''
    authorize_admin(request)
    slideshow = get_object_or_404(Slideshow, share_token=share_token)

    if request.method == 'DELETE':
        slideshow.is_gallery = False
        slideshow.save(update_fields=['is_gallery'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # POST → feature.
    raw_position = request.data.get('position', 0) if isinstance(request.data, dict) else 0
    try:
        position = int(raw_position)
    except (TypeError, ValueError):
        return Response({'position': ['must be an integer']}, status=400)
    if position < 0:
        return Response({'position': ['must be >= 0']}, status=400)

    from django.utils import timezone
    slideshow.is_gallery = True
    slideshow.gallery_position = position
    slideshow.featured_at = timezone.now()
    slideshow.save(update_fields=['is_gallery', 'gallery_position', 'featured_at'])
    return Response(SlideshowPublicSerializer(slideshow, context={'request': request}).data)


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
    `gallery_position` ascending then `-created_at`. Capped at 12 so a
    misconfigured admin entry can't blow up the payload.

    Curation flips the `is_gallery` flag and sets `gallery_position`.
    Two ways to flip it:
    - Django admin (privileged user account)
    - The `agentclip slideshow feature <token>` CLI, which hits the
      admin endpoint at `/api/v1/slideshow/<share_token>/feature/`
      authenticated by `AGENTCLIP_ADMIN_TOKEN`. The CLI path lets a
      curator (or an agent given the admin token) reorder the gallery
      without a Django admin trip — and without a redeploy.

    Public, unauthenticated, rate-limit-free (read-only).
    '''

    serializer_class = GallerySlideshowSerializer
    pagination_class = None
    queryset = (
        Slideshow.objects
        .filter(is_gallery=True)
        .order_by('gallery_position', '-created_at')
        .prefetch_related('slides')[:12]
    )


# ----- Public: POST /api/v1/slideshow/<share_token>/narrate/ -----


@extend_schema(
    request={
        'type': 'object',
        'properties': {
            'voice': {
                'type': 'string',
                'description': (
                    'OpenAI TTS voice (alloy, echo, fable, onyx, nova, '
                    'shimmer). Defaults to nova.'
                ),
            },
            'force': {
                'type': 'boolean',
                'description': (
                    'If true, regenerate audio for slides that already '
                    'have a narration. Default false (idempotent skip).'
                ),
            },
            'dry_run': {
                'type': 'boolean',
                'description': (
                    'If true, report estimated cost without calling OpenAI '
                    'or writing to the database. Default false.'
                ),
            },
        },
    },
    responses={200: SlideshowPublicSerializer},
    tags=['narration'],
)
@api_view(['POST'])
@authentication_classes([WriteTokenAuthentication])
@ratelimit(key='ip', rate='30/h', method='POST', block=True)
def slideshow_narrate(request, share_token):
    '''Generate per-slide narration MP3s. Auth: Bearer <write_token>.

    Loops the slideshow's slides and synthesizes audio from each
    caption via OpenAI TTS-1-HD. Idempotent by default — slides that
    already have audio are skipped. Pass `force=true` to regenerate
    everything, or `dry_run=true` to estimate cost without spending.

    Auth model: same as slide_add — only the write_token holder can
    narrate. The token is presented in the Authorization header
    exactly like an SDK upload request.

    Response: the public slideshow shape with `audio_url` populated
    on each newly-narrated slide. The response also includes a
    `narration` block with per-slide outcomes and total cost so the
    caller can render a summary or surface the spend.

    Cost: ~$0.030 per 1K caption characters. A 4-slide walkthrough
    with ~150-char captions is ~$0.018 per run.
    '''
    from . import narration as narration_module

    slideshow = get_object_or_404(Slideshow, share_token=share_token)
    # Reuse authorize_slideshow's write_token check, but resolved by
    # share_token instead of UUID (the API surface for narrate is
    # share_token-keyed for parity with the rest of the v1 namespace).
    import secrets as _secrets
    from .auth import AUTH_HEADER_PREFIX
    from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith(AUTH_HEADER_PREFIX):
        raise NotAuthenticated('missing Bearer token')
    supplied = header[len(AUTH_HEADER_PREFIX):].strip()
    if not supplied:
        raise NotAuthenticated('empty Bearer token')
    if not _secrets.compare_digest(supplied, slideshow.write_token):
        raise AuthenticationFailed('invalid write_token for this slideshow')

    body = request.data if isinstance(request.data, dict) else {}
    voice = body.get('voice') or narration_module.DEFAULT_VOICE
    force = bool(body.get('force', False))
    dry_run = bool(body.get('dry_run', False))

    if not slideshow.slides.exists():
        return Response(
            {'detail': 'this slideshow has no slides; nothing to narrate'},
            status=400,
        )

    try:
        result = narration_module.narrate_slideshow(
            slideshow,
            voice=voice,
            force=force,
            dry_run=dry_run,
        )
    except narration_module.NarrationConfigError as exc:
        # 503: the API is up but a downstream dependency (the
        # OPENAI_API_KEY secret) is not configured. The client should
        # not retry blindly; the operator needs to set the secret.
        return Response({'detail': str(exc)}, status=503)

    # Newly synthesized audio changes the MP4 input → bump the render
    # version. Skip on dry runs (no audio actually changed) and on
    # all-skipped runs (force=False idempotent path with audio already
    # in place).
    if not result.dry_run and result.narrated > 0:
        transaction.on_commit(slideshow.bump_render_version)

    payload = SlideshowPublicSerializer(slideshow, context={'request': request}).data
    payload['narration'] = {
        'narrated': result.narrated,
        'skipped': result.skipped,
        'total_chars': result.total_chars,
        'total_cost_usd': str(result.total_cost_usd),
        'dry_run': result.dry_run,
        'outcomes': [
            {
                'position': o.position,
                'status': o.status,
                'reason': o.reason,
                'chars': o.chars,
                'cost_usd': str(o.cost_usd),
                'voice': o.voice,
            }
            for o in result.outcomes
        ],
    }
    return Response(payload, status=200)
