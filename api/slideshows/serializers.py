'''DRF serializers for the slideshow API.

The serializers split into two flavors:

- *Public* shapes (``SlideshowPublicSerializer``, ``SlidePublicSerializer``):
  used both by API responses and by the viewer template. Never include
  ``write_token``; never include ``created_ip``.

- *Create-time* shape (``SlideshowCreateSerializer``): the only place
  ``write_token`` is rendered. Returned exactly once, at the moment of
  creation, since the SDK has no way to recover it later.

Media URLs are emitted as absolute URLs via the request context so the
viewer template, the API consumer, and any out-of-band crawler all see
the same canonical URL no matter where the storage backend lives.
'''

from __future__ import annotations

import os

from rest_framework import serializers

from .models import Slide, Slideshow


def _public_base_url() -> str | None:
    '''The configured public-facing base URL, when present.

    Wins over the inbound request's host. Useful when the API runs
    behind a tunnel, a CDN, or a reverse proxy that doesn't propagate
    the original Host header (cloudflared quick tunnels fall in this
    bucket; production deployments behind R2 + a public CDN host fall
    in the cleaner version of the same bucket).
    '''
    base = os.environ.get('AGENTCLIP_PUBLIC_BASE_URL')
    return base.rstrip('/') if base else None


def _build_absolute(path: str, request) -> str:
    '''Promote a relative path to an absolute URL.

    Order: AGENTCLIP_PUBLIC_BASE_URL > inbound request's scheme+host >
    fall back to the relative path itself (server-side consumers can
    still resolve it).
    '''
    if path.startswith(('http://', 'https://')):
        return path
    base = _public_base_url()
    if base:
        return base + path
    if request is not None:
        return request.build_absolute_uri(path)
    return path


def _absolute_media_url(obj: Slide, request) -> str:
    return _build_absolute(obj.media.url, request)


class SlidePublicSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Slide
        fields = ('id', 'position', 'title', 'caption', 'media_url', 'media_kind')
        read_only_fields = fields

    def get_media_url(self, obj: Slide) -> str:
        return _absolute_media_url(obj, self.context.get('request'))


class SlideshowPublicSerializer(serializers.ModelSerializer):
    '''Read-only shape for /s/<share_token> and the public API.'''

    slides = SlidePublicSerializer(many=True, read_only=True)
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = Slideshow
        fields = (
            'id',
            'title',
            'description',
            'summary',
            'created_by',
            'created_by_url',
            'created_at',
            'updated_at',
            'share_url',
            'slides',
        )
        read_only_fields = fields

    def get_share_url(self, obj: Slideshow) -> str:
        return _build_absolute(f'/s/{obj.share_token}/', self.context.get('request'))


class GallerySlideshowSerializer(serializers.ModelSerializer):
    '''Public, read-only shape for the home-page gallery endpoint.

    Strips every internal field — write_token, created_ip, gallery_position
    (an internal sort key), is_gallery (a curation flag) — and emits only
    the fields the gallery card needs to render. The cover image comes
    from the FIRST slide if any exist; absent otherwise.
    '''

    cover_image_url = serializers.SerializerMethodField()
    slide_count = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = Slideshow
        fields = (
            'id',
            'share_token',
            'title',
            'description',
            'created_by',
            'created_by_url',
            'created_at',
            'cover_image_url',
            'slide_count',
            'share_url',
            # Hero curation flag — clients use this to pick which row
            # gets the home-page hero polaroid. Most rows return false.
            'is_hero',
        )
        read_only_fields = fields

    def get_cover_image_url(self, obj: Slideshow) -> str | None:
        first = next(iter(obj.slides.all()), None)
        if first is None:
            return None
        return _absolute_media_url(first, self.context.get('request'))

    def get_slide_count(self, obj: Slideshow) -> int:
        return obj.slides.count()

    def get_share_url(self, obj: Slideshow) -> str:
        return _build_absolute(f'/s/{obj.share_token}/', self.context.get('request'))


class SlideshowCreateSerializer(serializers.ModelSerializer):
    '''Create-time shape. Renders ``write_token`` and ``edit_url`` exactly once.

    Both fields are credentials (or near-credentials):
    - ``write_token`` is the bearer credential the SDK keeps locally
    - ``edit_url`` embeds the per-slideshow ``edit_token`` in its query
      string, granting public-side edit access to anyone who holds it

    Neither field appears in any other serializer. Recovery for
    ``edit_url`` happens via GET /api/v1/slideshow/<slug>/edit-token/
    (authenticated by the write_token); ``write_token`` itself is
    never recoverable.
    '''

    write_token = serializers.CharField(read_only=True)
    share_url = serializers.SerializerMethodField()
    edit_url = serializers.SerializerMethodField()

    class Meta:
        model = Slideshow
        fields = (
            'id',
            'title',
            'description',
            'created_by',
            'created_by_url',
            'share_url',
            'edit_url',
            'write_token',
        )
        read_only_fields = ('id', 'share_url', 'edit_url', 'write_token')

    def get_share_url(self, obj: Slideshow) -> str:
        return _build_absolute(f'/s/{obj.share_token}/', self.context.get('request'))

    def get_edit_url(self, obj: Slideshow) -> str:
        return _build_absolute(
            f'/s/{obj.share_token}/edit?t={obj.edit_token}',
            self.context.get('request'),
        )


class SlideshowPatchSerializer(serializers.ModelSerializer):
    '''Patch shape. Title, description, summary, and creator credit all optional.'''

    class Meta:
        model = Slideshow
        fields = (
            'id',
            'title',
            'description',
            'summary',
            'created_by',
            'created_by_url',
        )
        read_only_fields = ('id',)


class EditTokenSerializer(serializers.Serializer):
    '''Response shape for the edit-token recovery + rotation endpoints.

    Both endpoints return the same envelope: the bare ``edit_token``
    (so SDK callers can rebuild URLs against any base) plus the
    fully-resolved ``edit_url`` for direct display.
    '''

    edit_token = serializers.CharField(read_only=True)
    edit_url = serializers.CharField(read_only=True)


class SlideCaptionEditSerializer(serializers.Serializer):
    '''Edit-page caption update body.

    The edit-token-authenticated endpoint accepts only `caption` —
    callers wanting to change media must use the write_token-protected
    `/api/slideshow/<id>/slides/<position>/` route. Keeping the surface
    narrow makes the security boundary easier to reason about.
    '''

    caption = serializers.CharField(required=True, allow_blank=True, max_length=500)


class SlideWriteSerializer(serializers.ModelSerializer):
    '''Create + update shape for slides. Media and caption only.

    ``position`` is server-assigned on create and read-only on update;
    callers identify the slide by its URL position, not its database id.
    ``media_kind`` and ``media_content_type`` are server-set from the
    upload's content type via the views' validator.
    '''

    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Slide
        fields = ('id', 'position', 'title', 'media', 'caption', 'media_url', 'media_kind')
        read_only_fields = ('id', 'position', 'media_url', 'media_kind')
        extra_kwargs = {
            'media': {'write_only': True, 'required': False},
            'title': {'required': False},
            'caption': {'required': False},
        }

    def get_media_url(self, obj: Slide) -> str:
        return _absolute_media_url(obj, self.context.get('request'))
