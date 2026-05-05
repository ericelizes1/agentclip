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

from rest_framework import serializers

from .models import Slide, Slideshow


def _absolute_media_url(obj: Slide, request) -> str:
    url = obj.media.url
    if request is not None and not url.startswith(('http://', 'https://')):
        return request.build_absolute_uri(url)
    return url


class SlidePublicSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Slide
        fields = ('id', 'position', 'caption', 'media_url', 'media_kind')
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
            'created_at',
            'updated_at',
            'share_url',
            'slides',
        )
        read_only_fields = fields

    def get_share_url(self, obj: Slideshow) -> str:
        request = self.context.get('request')
        path = f'/s/{obj.share_token}/'
        if request is not None:
            return request.build_absolute_uri(path)
        return path


class SlideshowCreateSerializer(serializers.ModelSerializer):
    '''Create-time shape. Renders the ``write_token`` exactly once.'''

    write_token = serializers.CharField(read_only=True)
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = Slideshow
        fields = ('id', 'title', 'description', 'share_url', 'write_token')
        read_only_fields = ('id', 'share_url', 'write_token')

    def get_share_url(self, obj: Slideshow) -> str:
        request = self.context.get('request')
        path = f'/s/{obj.share_token}/'
        if request is not None:
            return request.build_absolute_uri(path)
        return path


class SlideshowPatchSerializer(serializers.ModelSerializer):
    '''Patch shape. Title, description, summary all optional.'''

    class Meta:
        model = Slideshow
        fields = ('id', 'title', 'description', 'summary')
        read_only_fields = ('id',)


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
        fields = ('id', 'position', 'media', 'caption', 'media_url', 'media_kind')
        read_only_fields = ('id', 'position', 'media_url', 'media_kind')
        extra_kwargs = {
            'media': {'write_only': True, 'required': False},
            'caption': {'required': False},
        }

    def get_media_url(self, obj: Slide) -> str:
        return _absolute_media_url(obj, self.context.get('request'))
