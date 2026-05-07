'''Text-to-speech narration via OpenAI TTS.

Single integration point with the OpenAI Audio API. Pure data in,
pure data out — no storage, no DB, no Django coupling. Lets the
management command (slideshows.management.commands.narrate) own
the upload + persistence and keeps the service module trivially
unit-testable with a mocked client.

Default voice is "nova" because it's the most neutral / least
distracting of OpenAI's stock voices for product narration. Default
model is tts-1-hd for higher fidelity at ~$0.030/1K characters; the
cheaper tts-1 sounds noticeably more synthetic on slide-length
captions.

Caller responsibility:
- Validate that captions are non-empty before calling synthesize().
- Persist the returned mp3_bytes via FileField.save() and store the
  reported voice/cost on the Slide row.
- Catch NarrationConfigError at the entry point (the CLI command)
  and translate it into a clean operator error message.
'''

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from decimal import Decimal
from io import BytesIO
from typing import Optional

import openai


logger = logging.getLogger(__name__)


DEFAULT_MODEL = 'tts-1-hd'
DEFAULT_VOICE = 'nova'

# OpenAI TTS hard limit per request (as of 2026-05).
MAX_INPUT_CHARS = 4096

# Soft warning at ~3 minutes spoken at 200 wpm. Real slide captions
# are 50-200 chars; anything over this likely indicates the agent
# wrote a paragraph instead of a caption.
WARN_INPUT_CHARS = 1500

# Pricing reference: tts-1-hd is $0.030 per 1K characters (May 2026).
# Tracked here so the management command can report cost summaries
# without hitting the OpenAI billing API. Update when pricing
# changes.
HD_COST_PER_1K_CHARS = Decimal('0.030')

_RETRYABLE_EXCEPTIONS: tuple[type[Exception], ...] = (
    openai.APITimeoutError,
    openai.RateLimitError,
    openai.APIConnectionError,
)


class NarrationConfigError(RuntimeError):
    '''Raised when the OpenAI client can't be constructed.

    The management command should catch this and exit 1 with a clear
    "set OPENAI_API_KEY" message rather than letting the OpenAI SDK
    error bubble up unstyled.
    '''


@dataclass(frozen=True)
class NarrationResult:
    '''Output of one TTS call.

    `mp3_bytes` is the full MP3 body (the SDK streams it; we
    accumulate into memory because slide-length narrations are
    consistently small — typically 20-60 KB).
    '''

    mp3_bytes: bytes
    voice: str
    model: str
    input_chars: int
    cost_usd: Decimal


_client: Optional[openai.OpenAI] = None


def _get_client() -> openai.OpenAI:
    '''Lazy client construction.

    Importing this module must NOT require OPENAI_API_KEY to be set
    (Django startup imports the slideshows app at boot; missing
    OPENAI_API_KEY in dev shouldn't break the dev server). We
    construct on first synthesize() call instead.
    '''
    global _client
    if _client is not None:
        return _client
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise NarrationConfigError(
            'OPENAI_API_KEY is not set. Add it via `fly secrets set '
            'OPENAI_API_KEY=sk-... -a agentclip-api` (production) or '
            'export it in your local shell (development).'
        )
    _client = openai.OpenAI(api_key=api_key)
    return _client


def synthesize(
    text: str,
    *,
    voice: str = DEFAULT_VOICE,
    model: str = DEFAULT_MODEL,
) -> NarrationResult:
    '''Synthesize speech from `text` via OpenAI TTS.

    Validates input length, retries once on transient errors, returns
    the full MP3 body plus accounting metadata. Does not write to
    disk, the DB, or any storage backend.

    Raises:
        ValueError: caption is empty or exceeds MAX_INPUT_CHARS.
        NarrationConfigError: OPENAI_API_KEY not set.
        openai.APIError: non-retryable OpenAI failure (auth, server
            error, etc); propagated for the operator to inspect.
    '''
    if not text or not text.strip():
        raise ValueError('caption is empty; nothing to synthesize')
    chars = len(text)
    if chars > MAX_INPUT_CHARS:
        raise ValueError(
            f'caption exceeds OpenAI limit ({chars} > {MAX_INPUT_CHARS} chars)'
        )
    if chars > WARN_INPUT_CHARS:
        logger.warning(
            'caption is long (%d chars); narration will be ~%.1f minutes '
            'at typical speaking pace',
            chars,
            chars / 200.0 / 60.0 * 1.0,  # rough chars-per-minute approximation
        )

    client = _get_client()
    mp3_bytes = _stream_to_bytes(client, text=text, voice=voice, model=model)
    cost = (Decimal(chars) / Decimal(1000)) * HD_COST_PER_1K_CHARS

    return NarrationResult(
        mp3_bytes=mp3_bytes,
        voice=voice,
        model=model,
        input_chars=chars,
        cost_usd=cost,
    )


def _stream_to_bytes(
    client: openai.OpenAI,
    *,
    text: str,
    voice: str,
    model: str,
    max_retries: int = 1,
) -> bytes:
    '''Call the OpenAI TTS streaming endpoint and accumulate the body.

    One retry on transient errors with a short backoff. The OpenAI
    SDK already retries some categories internally; this wrapper adds
    a single application-level retry so we don't fight the SDK's own
    retry budget.
    '''
    attempt = 0
    last_error: Exception | None = None
    while attempt <= max_retries:
        try:
            buffer = BytesIO()
            with client.audio.speech.with_streaming_response.create(
                model=model,
                voice=voice,
                input=text,
            ) as response:
                for chunk in response.iter_bytes():
                    buffer.write(chunk)
            return buffer.getvalue()
        except _RETRYABLE_EXCEPTIONS as exc:
            last_error = exc
            attempt += 1
            if attempt > max_retries:
                break
            sleep_s = 2 ** (attempt - 1)
            logger.warning(
                'OpenAI TTS transient error (%s); retrying in %ds',
                type(exc).__name__,
                sleep_s,
            )
            time.sleep(sleep_s)
    # Exhausted retries. Re-raise so the caller (the CLI) can surface it.
    assert last_error is not None
    raise last_error


def reset_client_for_tests() -> None:
    '''Test hook: clear the cached client so a fresh env-var read happens.

    Tests that monkeypatch OPENAI_API_KEY (or assert on its absence)
    need to call this between cases. Production code never calls it.
    '''
    global _client
    _client = None


# ----- Slideshow-level narration loop -----
#
# The Django management command and the public API endpoint both want
# to run the same loop: walk a slideshow's slides, narrate the ones
# that need it, persist results, return per-slide status. Centralizing
# the logic here means the command and the endpoint can't drift.


@dataclass(frozen=True)
class SlideNarrationOutcome:
    '''One slide's outcome from narrate_slideshow.'''

    position: int
    status: str  # one of: 'narrated', 'skipped', 'planned' (dry-run)
    reason: str | None = None
    chars: int = 0
    cost_usd: Decimal = Decimal('0')
    voice: str = ''


@dataclass(frozen=True)
class NarrateSlideshowResult:
    '''Aggregate outcome of a narrate_slideshow run.'''

    outcomes: list[SlideNarrationOutcome]
    total_chars: int
    total_cost_usd: Decimal
    narrated: int
    skipped: int
    dry_run: bool


def narrate_slideshow(
    slideshow,  # Slideshow instance; not annotated to avoid circular import
    *,
    voice: str = DEFAULT_VOICE,
    force: bool = False,
    dry_run: bool = False,
) -> NarrateSlideshowResult:
    '''Narrate every applicable slide on the given slideshow.

    Idempotent by default: slides with audio set are skipped unless
    force=True. Slides with empty captions are always skipped (status
    'skipped', reason 'caption is empty').

    `dry_run=True` reports the plan and estimated cost without calling
    OpenAI or writing to the database. Outcomes for dry-run slides are
    marked status='planned' so callers can render the right verb.

    Raises:
        NarrationConfigError: OPENAI_API_KEY not set (only when dry_run
            is False; dry-run skips the API entirely).
    '''
    # Imported lazily to keep this module Django-agnostic at import time.
    from django.core.files.base import ContentFile

    outcomes: list[SlideNarrationOutcome] = []
    total_chars = 0
    total_cost = Decimal('0')
    narrated = 0
    skipped = 0

    slides = list(slideshow.slides.order_by('position'))

    for slide in slides:
        position = slide.position

        if not slide.caption or not slide.caption.strip():
            outcomes.append(SlideNarrationOutcome(
                position=position,
                status='skipped',
                reason='caption is empty',
            ))
            skipped += 1
            continue

        if slide.audio and not force:
            outcomes.append(SlideNarrationOutcome(
                position=position,
                status='skipped',
                reason='already narrated',
            ))
            skipped += 1
            continue

        chars = len(slide.caption)
        est_cost = (Decimal(chars) / Decimal(1000)) * HD_COST_PER_1K_CHARS

        if dry_run:
            outcomes.append(SlideNarrationOutcome(
                position=position,
                status='planned',
                chars=chars,
                cost_usd=est_cost,
                voice=voice,
            ))
            total_chars += chars
            total_cost += est_cost
            continue

        try:
            result = synthesize(slide.caption, voice=voice)
        except ValueError as exc:
            outcomes.append(SlideNarrationOutcome(
                position=position,
                status='skipped',
                reason=f'synthesis rejected: {exc}',
            ))
            skipped += 1
            continue

        slide.audio.save(
            f'{slide.position}.mp3',
            ContentFile(result.mp3_bytes),
            save=False,
        )
        slide.audio_voice = result.voice
        slide.audio_duration_ms = 0  # duration extraction deferred
        slide.save(update_fields=['audio', 'audio_voice', 'audio_duration_ms'])

        outcomes.append(SlideNarrationOutcome(
            position=position,
            status='narrated',
            chars=result.input_chars,
            cost_usd=result.cost_usd,
            voice=result.voice,
        ))
        total_chars += result.input_chars
        total_cost += result.cost_usd
        narrated += 1

    return NarrateSlideshowResult(
        outcomes=outcomes,
        total_chars=total_chars,
        total_cost_usd=total_cost,
        narrated=narrated,
        skipped=skipped,
        dry_run=dry_run,
    )
