'''Data model for slideshows and the slides they contain.

The shape is deliberately small: two tables, one foreign key. Most of
the design budget went to the auth model, which is captured entirely
in the opaque tokens on Slideshow.

Token model:

- ``share_token`` is the public, unguessable URL component. 16
  url-safe characters give 96 bits of entropy, plenty for an
  unauthenticated lookup endpoint behind a rate limit.

- ``write_token`` is the credential the SDK uses to mutate slides
  and the summary. 32 url-safe characters, 192 bits, treated as
  bearer-credential-equivalent in transit and at rest. Stored
  plaintext on the row because it's emitted in the create response
  and the SDK has no recovery path otherwise.

- ``edit_token`` is a per-slideshow secret distinct from the public
  ``share_token``. Anyone with the URL ``/s/<share_token>/edit?t=<edit_token>``
  can edit; nobody else can. Returned alongside ``share_token`` in
  the create response. Recoverable by the slideshow's creator via
  ``GET /api/v1/slideshow/<share_token>/edit-token/`` authenticated
  with the same write_token that created the row.

- ``created_by_token_hash`` is SHA-256(write_token) stamped at
  creation time. Used as the ownership check for edit_token
  recovery and rotation. We store the hash, never the plaintext —
  even though write_token already lives plaintext on the row, this
  hash enables hash-comparison without leaking the credential
  through a different code path.

There is no User FK. v1 has no accounts; the write_token IS the
identity. When accounts ship later, a nullable owner FK lands on
Slideshow and the existing rows backfill with NULL (orphan slideshows
remain mutable via their write_token, exactly as today).
'''

from __future__ import annotations

import hashlib
import secrets
import uuid

from django.db import models


def hash_write_token(write_token: str) -> str:
    '''Return SHA-256 of a write_token, hex-encoded.

    The ownership check for edit_token recovery hashes the incoming
    Authorization-header write_token and compares against the stored
    hash. SHA-256 is more than enough for "did the same caller create
    this row" — we're not protecting against rainbow tables (the
    write_token is already 192 bits of entropy from secrets), just
    against an attack that confuses hash collisions for ownership.
    '''
    return hashlib.sha256(write_token.encode('utf-8')).hexdigest()


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


def _edit_token() -> str:
    '''~43 url-safe chars; 256 bits of entropy.

    Higher entropy than share_token because this one DOES grant
    mutation rights (delete-slide, edit-caption from the public-side
    /s/<slug>/edit?t=<edit_token> URL). Keep it short enough to fit
    in a query string + look reasonable when it scrolls past in the
    terminal where the agent prints both URLs after creation.
    '''
    return secrets.token_urlsafe(32)


def _slide_media_path(instance: 'Slide', filename: str) -> str:
    '''Storage path: scoped per slideshow, original filename preserved.

    Per-slideshow scoping makes manual cleanup tractable in the
    eventual delete flow, and django-storages' configured
    AWS_S3_FILE_OVERWRITE=False guarantees collisions get suffixed.
    '''
    return f'slideshows/{instance.slideshow_id}/clips/{filename}'


def _slide_audio_path(instance: 'Slide', filename: str) -> str:
    '''Storage path for the per-slide narration MP3.

    Mirrors `_slide_media_path` but routes audio under an `audio/`
    subdirectory and uses the slide position as the deterministic
    filename so the `narrate` management command's `--force` flow
    produces predictable overwrites.
    '''
    return f'slideshows/{instance.slideshow_id}/audio/{filename}'


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

# Per-slideshow ceilings. The product is short, focused walkthroughs:
# the bundled SKILL.md tells agents "onboarding QA is 10–15 slides;
# focused bug repro is 3–5". 20 is a comfortable upper bound on
# legitimate runs; past it the run is trying to be something else
# (a tour, a portfolio collection — those land in v0.2 as collections).
#
# 100MB total is the headroom budget: 20 slides × 5MB average covers
# 30-second MP4 clips comfortably, well past typical screenshot sizes
# (a 1080p PNG is 200–500KB).
MAX_SLIDES_PER_SLIDESHOW = 20
MAX_BYTES_PER_SLIDESHOW = 100 * 1024 * 1024


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
    edit_token = models.CharField(
        max_length=64,
        unique=True,
        default=_edit_token,
        editable=False,
        help_text=(
            'Per-slideshow secret used in the public edit URL '
            '(/s/<share_token>/edit?t=<edit_token>). Distinct from '
            'write_token; rotatable; recoverable by the creator via the '
            'edit-token recovery endpoint.'
        ),
    )
    created_by_token_hash = models.CharField(
        max_length=64,
        blank=True,
        default='',
        db_index=True,
        editable=False,
        help_text=(
            'SHA-256 of the write_token that created this row. Used as '
            'the ownership check for edit-token recovery + rotation. '
            'Blank on legacy rows created before the field existed; '
            'those rows can never recover a lost edit URL via the API.'
        ),
    )

    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    summary = models.TextField(blank=True, default='')

    # Gallery curation: which slideshows surface on the home-page gallery
    # and in what order. Replaces the old _GALLERY_TOKENS code constant
    # (which broke OSS portability — tokens only exist in one DB).
    # Gallery membership is an editorial decision the operator manages
    # via the admin; flipping is_gallery=True is the only step required.
    is_gallery = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Show on the home-page gallery. Curated via the admin; not user-controlled.',
    )
    gallery_position = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        help_text='Sort order within the gallery (ascending). Ties broken by -created_at.',
    )
    # Hero curation: a single slideshow surfaces in the home-page hero
    # polaroid above all gallery cards. Independent of `is_gallery` —
    # the hero clip can be in the gallery too (typical) or live as a
    # standalone feature. We don't enforce single-hero at the DB
    # level; the API picks the most-recently-featured matching row.
    is_hero = models.BooleanField(
        default=False,
        db_index=True,
        help_text=(
            'Show as the home-page hero polaroid. Curated via the admin. '
            'When multiple slideshows have is_hero=True the API picks the '
            'most recently featured. Independent of is_gallery.'
        ),
    )
    # Audit trail for curation. Set on every successful feature; left
    # alone on unfeature so we retain "last featured at X" even after
    # a slideshow drops out of the gallery. Useful for retrospectives
    # ('what was on the home page when we tweeted on date Y?').
    featured_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp of the most recent feature event. Null if never featured.',
    )

    # Optional creator credit, set at create time and rendered on the
    # public viewer. Text-based now, future-compatible with a real
    # owner FK once accounts ship; the two coexist (text = display
    # credit, FK = authorization). See plan 2026-05-05-001.
    created_by = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Display credit for the run, e.g. "Eric Elizes". Optional.',
    )
    created_by_url = models.URLField(
        max_length=200,
        blank=True,
        default='',
        help_text='Optional URL the creator credit links to (portfolio, GitHub, etc.).',
    )

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
    media_bytes = models.PositiveIntegerField(
        default=0,
        help_text=(
            'Size of the uploaded media in bytes. Populated at slide-add '
            'time; used to enforce MAX_BYTES_PER_SLIDESHOW without re-'
            'reading the storage backend on every request.'
        ),
    )
    title = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text=(
            'Short eyebrow title for the slide. Renders above the image '
            'in the viewer; gives the slideshow visual hierarchy and '
            'makes long runs skimmable. The bundled agentclip skill '
            'tells agents to write a 3-7 word title plus a longer '
            'caption per slide.'
        ),
    )
    caption = models.TextField()

    # Per-slide narration. Generated via the `narrate` management
    # command (api/slideshows/management/commands/narrate.py), which
    # synthesizes an MP3 from the caption text using OpenAI TTS-1-HD
    # and stores it in the same R2 bucket as `media`. Optional —
    # slideshows without audio fall back to silent rendering on the
    # web client.
    audio = models.FileField(
        upload_to=_slide_audio_path,
        blank=True,
        null=True,
        help_text=(
            'Optional narration MP3 generated from `caption`. Populated '
            'by the `narrate` management command; absent until then.'
        ),
    )
    audio_voice = models.CharField(
        max_length=32,
        blank=True,
        default='',
        help_text=(
            'OpenAI TTS voice used to generate `audio` (e.g. "nova"). '
            'Blank when audio is unset.'
        ),
    )
    audio_duration_ms = models.PositiveIntegerField(
        default=0,
        help_text=(
            'Duration of `audio` in milliseconds. 0 when audio is unset '
            'or duration extraction failed; the player falls back to '
            'indeterminate progress until the metadata loads.'
        ),
    )

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
