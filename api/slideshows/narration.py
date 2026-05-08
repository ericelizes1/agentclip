'''Text-to-speech narration via OpenAI TTS.

Single integration point with the OpenAI Audio API. Pure data in,
pure data out — no storage, no DB, no Django coupling. Lets the
management command (slideshows.management.commands.narrate) own
the upload + persistence and keeps the service module trivially
unit-testable with a mocked client.

Default voice is "nova" because it's the most neutral / least
distracting of OpenAI's stock voices for product narration. Default
model is gpt-4o-mini-tts — OpenAI's current-generation TTS, measurably
more natural than tts-1-hd in independent arenas at roughly the same
per-clip cost (~$0.020/1K characters; token-priced upstream).

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
import subprocess
import tempfile
import time
from dataclasses import dataclass
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Optional

import openai


logger = logging.getLogger(__name__)


DEFAULT_MODEL = 'gpt-4o-mini-tts'
DEFAULT_VOICE = 'nova'
DEFAULT_SPEED = 1.0


# RunType -> (voice, speed) mapping. Same voice used across the whole
# clip (intro + every slide + outro) so the listener hears one
# consistent presenter. Speed is the OpenAI TTS `speed` parameter
# (0.25..4.0); we stay near 1.0 for natural pacing.
RUN_TYPE_VOICE: dict[str, tuple[str, float]] = {
    'bug_repro': ('onyx', 1.0),               # deeper, factual
    'smoke_test': ('nova', 1.0),              # neutral, brisk
    'demo': ('shimmer', 0.95),                # warmer, polished, slower
    'onboarding_eval': ('nova', 1.0),         # observational
    'competitive_teardown': ('echo', 1.0),    # analytical
    'generic': ('nova', 1.0),                 # default
}


def voice_for(slideshow) -> tuple[str, float]:
    '''Return (voice, speed) for a slideshow based on its run_type.

    Falls back to the GENERIC mapping for any unrecognized value, so
    legacy rows or callers passing an unexpected string never crash.
    '''
    run_type = getattr(slideshow, 'run_type', '') or 'generic'
    return RUN_TYPE_VOICE.get(run_type, RUN_TYPE_VOICE['generic'])

# OpenAI TTS hard limit per request (as of 2026-05).
MAX_INPUT_CHARS = 4096

# Soft warning at ~3 minutes spoken at 200 wpm. Real slide captions
# are 50-200 chars; anything over this likely indicates the agent
# wrote a paragraph instead of a caption.
WARN_INPUT_CHARS = 1500

# Pricing reference: gpt-4o-mini-tts is token-priced upstream
# ($0.60/1M text-input tokens + $12/1M audio-output tokens) which
# works out to ~$0.020 per 1K input characters at typical product
# narration cadence (~750 chars/min spoken). Approximation kept here
# so the management command can report cost summaries without hitting
# the OpenAI billing API. Update when pricing or pacing assumptions
# change.
COST_PER_1K_CHARS = Decimal('0.020')

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
    speed: float = DEFAULT_SPEED,
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
    mp3_bytes = _stream_to_bytes(
        client, text=text, voice=voice, model=model, speed=speed
    )
    cost = (Decimal(chars) / Decimal(1000)) * COST_PER_1K_CHARS

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
    speed: float = DEFAULT_SPEED,
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
                speed=speed,
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


def probe_mp3_duration_ms(mp3_bytes: bytes) -> int:
    '''Return the playback duration of `mp3_bytes` in whole milliseconds.

    Writes to a tmpfile and shells out to ffprobe (already on the PATH
    in production for the MP4 render pipeline). Returns 0 on any
    failure — the caller can persist 0 and the frontend falls back to
    metadata-load probing client-side, so a duration miss is non-fatal.
    '''
    if not mp3_bytes:
        return 0
    try:
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as fp:
            fp.write(mp3_bytes)
            tmp_path = Path(fp.name)
        try:
            result = subprocess.run(
                [
                    'ffprobe', '-v', 'error',
                    '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    str(tmp_path),
                ],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode != 0:
                return 0
            seconds = float(result.stdout.strip())
            return max(0, int(round(seconds * 1000)))
        finally:
            tmp_path.unlink(missing_ok=True)
    except (subprocess.SubprocessError, ValueError, OSError) as exc:
        logger.warning('ffprobe duration probe failed: %s', exc)
        return 0


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
    voice: str | None = None,
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

    # Resolve voice + pacing from run_type when the caller didn't pin a
    # specific voice. Letting the slideshow drive voice keeps intro,
    # all slides, and outro consistent — one presenter per clip.
    resolved_voice, speed = voice_for(slideshow)
    if voice is not None:
        resolved_voice = voice

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
        est_cost = (Decimal(chars) / Decimal(1000)) * COST_PER_1K_CHARS

        if dry_run:
            outcomes.append(SlideNarrationOutcome(
                position=position,
                status='planned',
                chars=chars,
                cost_usd=est_cost,
                voice=resolved_voice,
            ))
            total_chars += chars
            total_cost += est_cost
            continue

        try:
            result = synthesize(slide.caption, voice=resolved_voice, speed=speed)
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
        slide.audio_duration_ms = probe_mp3_duration_ms(result.mp3_bytes)
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


# ----- Slideshow-level intro / outro narration -----
#
# The render task synthesizes a spoken intro from `slideshow.description`
# and a spoken outro from `slideshow.summary`, then plays each over a
# brand title/end card frame at the bookends of the rendered MP4. This
# is what turns "captions read aloud" into "narrated walkthrough" —
# without an opener that frames the run and a closer that wraps it,
# the video has no narrative shape.
#
# Both functions return None when the source field is empty so the
# caller can skip the bookend segment cleanly. They never raise on
# empty input — empty intro/outro is a valid output state.


@dataclass(frozen=True)
class BookendNarrationResult:
    '''Output of synthesize_intro / synthesize_outro.

    `mp3_bytes` is None when the source text was blank — the caller
    skips the bookend segment in that case rather than failing the
    render. `voice` and `cost_usd` are still populated for accounting
    when synthesis ran.
    '''

    mp3_bytes: bytes | None
    voice: str
    cost_usd: Decimal
    chars: int


def synthesize_intro(slideshow) -> BookendNarrationResult:
    '''Synthesize the spoken intro from `slideshow.description`.

    Returns a BookendNarrationResult whose ``mp3_bytes`` is None when
    the description is empty. Voice + speed are pulled from the
    slideshow's run_type via voice_for(); the intro therefore matches
    the rest of the clip.
    '''
    text = (slideshow.description or '').strip()
    voice, speed = voice_for(slideshow)
    if not text:
        return BookendNarrationResult(
            mp3_bytes=None, voice=voice, cost_usd=Decimal('0'), chars=0,
        )
    result = synthesize(text, voice=voice, speed=speed)
    return BookendNarrationResult(
        mp3_bytes=result.mp3_bytes,
        voice=result.voice,
        cost_usd=result.cost_usd,
        chars=result.input_chars,
    )


def synthesize_outro(slideshow) -> BookendNarrationResult:
    '''Synthesize the spoken outro from `slideshow.summary`.

    Same shape as synthesize_intro. Empty summary → no audio; the
    caller appends only the visible end card (held for a default
    duration) when this happens.
    '''
    text = (slideshow.summary or '').strip()
    voice, speed = voice_for(slideshow)
    if not text:
        return BookendNarrationResult(
            mp3_bytes=None, voice=voice, cost_usd=Decimal('0'), chars=0,
        )
    result = synthesize(text, voice=voice, speed=speed)
    return BookendNarrationResult(
        mp3_bytes=result.mp3_bytes,
        voice=result.voice,
        cost_usd=result.cost_usd,
        chars=result.input_chars,
    )
