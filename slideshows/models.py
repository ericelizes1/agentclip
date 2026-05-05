'''Data model for slideshows and the slides they contain.

The shape is deliberately small: two tables, one foreign key. Most of
the design budget went to the auth model, which is captured entirely
in the two opaque tokens on Slideshow.

Token model:

- ``share_token`` is the public, unguessable URL component. 16
  url-safe characters give 96 bits of entropy, plenty for an
  unauthenticated lookup endpoint behind a rate limit.

- ``write_token`` is the credential the SDK uses to mutate slides
  and the summary. 32 url-safe characters, 192 bits, treated as
  bearer-credential-equivalent in transit and at rest.

There is no User FK. v1 has no accounts; the write_token IS the
identity. When accounts ship later, a nullable owner FK lands on
Slideshow and the existing rows backfill with NULL (orphan slideshows
remain mutable via their write_token, exactly as today).
'''

from __future__ import annotations

import secrets
import uuid

from django.db import models


def _share_token() -> str:
    '''16 url-safe chars; 96 bits of entropy.

    secrets.token_urlsafe takes a *byte* count and returns roughly
    1.33x that many characters. 12 bytes encodes to 16 chars.
    '''
    return secrets.token_urlsafe(12)


def _write_token() -> str:
    '''32 url-safe chars; 192 bits of entropy.

    Generous on purpose: this token grants full mutation rights with
    no rotation flow in v1, so ample entropy now is much cheaper than
    a credential rotation later.
    '''
    return secrets.token_urlsafe(24)


def _slide_media_path(instance: 'Slide', filename: str) -> str:
    '''Storage path: scoped per slideshow, original filename preserved.

    Per-slideshow scoping makes manual cleanup tractable in the
    eventual delete flow, and django-storages' configured
    AWS_S3_FILE_OVERWRITE=False guarantees collisions get suffixed.
    '''
    return f'slideshows/{instance.slideshow_id}/clips/{filename}'


# Allowed upload content types. Browsers render these natively without
# any client-side decoding, which is the bar for "shareable URL".
ALLOWED_IMAGE_TYPES = frozenset({
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
})
ALLOWED_VIDEO_TYPES = frozenset({
    'video/mp4',
    'video/webm',
    'video/quicktime',
})
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

# Per-clip upload size limit. 25MB covers a handful of seconds of
# 1080p H.264 video and is generous for any screenshot/GIF; anything
# bigger is almost certainly an error or abuse.
MAX_MEDIA_BYTES = 25 * 1024 * 1024


class MediaKind(models.TextChoices):
    IMAGE = 'image', 'Image'
    VIDEO = 'video', 'Video'


class Slideshow(models.Model):
    '''A single QA run uploaded by an agent.

    Auto-publishes on creation; there's no separate ``published``
    bit. The first slide makes the slideshow visible at /s/<share_token>.
    '''

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share_token = models.CharField(
        max_length=32,
        unique=True,
        default=_share_token,
        editable=False,
        help_text='Public, unguessable URL component used at /s/<share_token>.',
    )
    write_token = models.CharField(
        max_length=64,
        unique=True,
        default=_write_token,
        editable=False,
        help_text='Bearer credential. Whoever holds it can mutate this slideshow.',
    )

    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    summary = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Forensics: not exposed in any serializer; admin-only. Captured
    # at create time so abuse can be traced even if the slideshow is
    # later edited from another origin.
    created_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['share_token']),
        ]

    def __str__(self) -> str:
        return self.title or f'slideshow {self.id}'


class Slide(models.Model):
    '''One clip in a slideshow: an image OR a short video, plus a caption.

    ``position`` is 1-based and unique per slideshow. ``media_kind``
    distinguishes images (PNG/JPEG/GIF/WebP) from short videos
    (MP4/WebM/MOV) so the viewer can render <img> vs <video>. We use
    a generic FileField, not ImageField, so the same field handles
    both; validation happens at the API boundary.
    '''

    slideshow = models.ForeignKey(
        Slideshow,
        related_name='slides',
        on_delete=models.CASCADE,
    )
    position = models.PositiveIntegerField()
    media = models.FileField(upload_to=_slide_media_path)
    media_kind = models.CharField(
        max_length=8,
        choices=MediaKind.choices,
        default=MediaKind.IMAGE,
        help_text='image | video; sniffed from upload Content-Type at the API boundary.',
    )
    media_content_type = models.CharField(
        max_length=64,
        blank=True,
        default='',
        help_text='Original Content-Type at upload, kept for forensic and debug use.',
    )
    caption = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('slideshow', 'position')
        constraints = [
            models.UniqueConstraint(
                fields=['slideshow', 'position'],
                name='unique_slide_position_per_slideshow',
            ),
        ]

    def __str__(self) -> str:
        return f'{self.slideshow_id} #{self.position}'

    @property
    def is_video(self) -> bool:
        return self.media_kind == MediaKind.VIDEO
