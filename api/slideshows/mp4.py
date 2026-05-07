'''Server-side MP4 render: stitch per-slide image + narration MP3 into a video.

Pure data in, pure data out — no storage, no DB, no Django coupling. The
Celery task in ``slideshows.tasks`` owns the FileField round-trip; this
module just turns N (image, audio) pairs into one playable MP4.

The output codec profile (H.264 baseline + AAC, 1920x1080@30fps) is the
broadest-compatibility choice we can make. Everything that matters for
distribution — GitHub PR inline video, Slack/Discord/iMessage unfurls,
Twitter Player Cards, Notion iframes, plain ``<video>`` tags — plays this
profile without complaint.

Caller responsibility:
- Hand in slides in playback order (caller controls position).
- Provide ``audio_bytes`` per slide when narration exists. When a slide has
  no audio, the segment holds the still image for ``STILL_DURATION_S``.
- Catch ``MP4RenderError`` at the entry point (the Celery task) and
  translate to a failure that the lazy public endpoint can re-enqueue.
'''

from __future__ import annotations

import io
import logging
import os
import shlex
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from PIL import Image


logger = logging.getLogger(__name__)


# Output canvas. 1080p is the sweet spot: looks crisp on a phone, plays
# fine in a Slack DM, doesn't bloat MP4 file size for screenshot-heavy
# content. Bumping to 4K balloons file sizes 4x with no perceptible win
# for the kind of content this product hosts (terminal output, web UI
# walkthroughs).
OUTPUT_WIDTH = 1920
OUTPUT_HEIGHT = 1080
OUTPUT_FPS = 30

# How long a slide is held when it has no narration audio. Three seconds
# is long enough to read a short caption; dragging beyond that on a silent
# slide feels broken. Tunable; see plan open question.
STILL_DURATION_S = 3.0

# Poster image (OG / Twitter card). 1200x630 is the FB-recommended OG
# image size and renders well in Slack, iMessage, Twitter, and Linear.
POSTER_WIDTH = 1200
POSTER_HEIGHT = 630

# Hard timeouts on the ffmpeg subprocess. Per-segment timeout is generous
# enough for a 25MB video slide encode; final concat is fast (no re-encode).
SEGMENT_TIMEOUT_S = 120
CONCAT_TIMEOUT_S = 60

# ffmpeg arguments shared across every segment. libx264 baseline + yuv420p
# pixel format is the "plays everywhere" profile. Bumping to High would
# shave a bit of bitrate but break Safari < 11 and some mobile email
# clients; not worth it.
_VIDEO_CODEC_ARGS = [
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-pix_fmt', 'yuv420p',
    '-r', str(OUTPUT_FPS),
    '-preset', 'medium',
    '-crf', '23',
]
_AUDIO_CODEC_ARGS = [
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',  # stereo so QuickTime / Twitter Player don't reject mono
    '-ar', '44100',
]


class MP4RenderError(Exception):
    '''Raised when MP4 rendering fails.

    Subclasses distinguish operator-fixable config errors (ffmpeg missing,
    bad ENV) from infrastructure or input errors that probably want a
    Celery retry.
    '''


class MP4RenderConfigError(MP4RenderError):
    '''Operator-fixable: ffmpeg missing on PATH, etc.'''


@dataclass(frozen=True)
class SlideInput:
    '''One slide's render inputs.

    Pure data — no Django model objects, so this module stays trivially
    unit-testable. The Celery task converts ``Slide`` rows to this shape.
    '''

    media_bytes: bytes
    media_kind: str  # 'image' or 'video'
    media_filename: str  # e.g. 'shot.png' — ffmpeg infers format from the extension
    audio_bytes: bytes | None
    audio_duration_ms: int  # 0 when audio is absent


@dataclass(frozen=True)
class RenderResult:
    '''Output of ``build_mp4``.'''

    mp4_bytes: bytes
    duration_ms: int
    segment_count: int


def _require_ffmpeg() -> str:
    '''Locate ffmpeg or raise a config error pointing the operator at the fix.'''
    binary = shutil.which('ffmpeg')
    if not binary:
        raise MP4RenderConfigError(
            'ffmpeg not found on PATH. The render worker image must apt-install ffmpeg; '
            'see api/Dockerfile.'
        )
    return binary


def _require_ffprobe() -> str:
    binary = shutil.which('ffprobe')
    if not binary:
        raise MP4RenderConfigError(
            'ffprobe not found on PATH. ffprobe ships with the ffmpeg package on Debian; '
            'check api/Dockerfile.'
        )
    return binary


def _run(cmd: list[str], *, timeout: float, ctx: str) -> None:
    '''Run an ffmpeg/ffprobe command, capturing stderr for diagnostics.'''
    logger.debug('mp4: %s: %s', ctx, ' '.join(shlex.quote(c) for c in cmd))
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise MP4RenderError(
            f'{ctx} timed out after {timeout}s. The render worker may need a larger '
            f'machine or a longer per-task budget.'
        ) from exc
    if result.returncode != 0:
        stderr = result.stderr.decode('utf-8', errors='replace').strip()
        raise MP4RenderError(
            f'{ctx} failed (exit {result.returncode}): {stderr[:2000]}'
        )


def _probe_duration_seconds(path: Path) -> float:
    '''Return the duration of a media file in seconds. Used for video slides.'''
    ffprobe = _require_ffprobe()
    try:
        result = subprocess.run(
            [
                ffprobe,
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                str(path),
            ],
            capture_output=True,
            timeout=15,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode('utf-8', errors='replace')
        raise MP4RenderError(
            f'ffprobe could not read {path.name}: {stderr.strip()[:500]}'
        ) from exc
    text = result.stdout.decode('utf-8').strip()
    try:
        return float(text)
    except ValueError as exc:
        raise MP4RenderError(
            f'ffprobe returned non-numeric duration {text!r} for {path.name}'
        ) from exc


def _segment_duration(slide: SlideInput, video_path: Path | None) -> float:
    '''How long should this slide play for?

    - Image slide with audio: audio length.
    - Image slide without audio: STILL_DURATION_S.
    - Video slide: max(video_duration, audio_duration). When the source
      video is shorter than the narration, the last frame holds while
      narration finishes; when narration is shorter, the source video
      plays out.
    '''
    audio_seconds = slide.audio_duration_ms / 1000.0 if slide.audio_duration_ms else 0.0
    if slide.media_kind == 'video' and video_path is not None:
        video_seconds = _probe_duration_seconds(video_path)
        return max(video_seconds, audio_seconds, STILL_DURATION_S / 2)
    if audio_seconds > 0:
        return audio_seconds
    return STILL_DURATION_S


def _build_image_segment(
    *,
    ffmpeg: str,
    image_path: Path,
    audio_path: Path | None,
    duration: float,
    output_path: Path,
) -> None:
    '''Encode one slide segment from a still image (+ optional audio).'''
    cmd: list[str] = [ffmpeg, '-y', '-loop', '1', '-t', f'{duration:.3f}', '-i', str(image_path)]
    if audio_path is not None:
        cmd += ['-i', str(audio_path)]
    # Letterbox to OUTPUT_WIDTH x OUTPUT_HEIGHT keeping aspect ratio. The
    # `force_original_aspect_ratio=decrease` + `pad` pair gives black
    # bars on whichever axis falls short; format=yuv420p ensures the
    # resulting stream is the codec-friendly chroma layout.
    vf = (
        f'scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,'
        f'pad={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,'
        f'format=yuv420p'
    )
    cmd += ['-vf', vf]
    cmd += _VIDEO_CODEC_ARGS
    if audio_path is not None:
        cmd += _AUDIO_CODEC_ARGS + ['-shortest']
    else:
        # Synthesize silent audio of the same duration so every segment
        # has both streams — keeps the concat demuxer simple.
        cmd = [
            ffmpeg, '-y',
            '-loop', '1', '-t', f'{duration:.3f}', '-i', str(image_path),
            '-f', 'lavfi', '-t', f'{duration:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
            '-vf', vf,
            *_VIDEO_CODEC_ARGS,
            *_AUDIO_CODEC_ARGS,
            '-shortest',
            str(output_path),
        ]
        _run(cmd, timeout=SEGMENT_TIMEOUT_S, ctx='image-segment-silent')
        return
    cmd.append(str(output_path))
    _run(cmd, timeout=SEGMENT_TIMEOUT_S, ctx='image-segment')


def _build_video_segment(
    *,
    ffmpeg: str,
    video_path: Path,
    audio_path: Path | None,
    duration: float,
    output_path: Path,
) -> None:
    '''Encode one slide segment from a source video clip.

    Source video is scaled+padded to the output canvas. Audio source:
    narration MP3 if provided (replaces source audio for caption-driven
    consistency), else source video's own audio if present, else silence.
    '''
    cmd: list[str] = [ffmpeg, '-y', '-i', str(video_path)]
    if audio_path is not None:
        cmd += ['-i', str(audio_path)]
        # Map video stream from input 0 and audio from input 1.
        cmd += ['-map', '0:v:0', '-map', '1:a:0']
    vf = (
        f'scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,'
        f'pad={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,'
        f'format=yuv420p'
    )
    cmd += ['-vf', vf]
    cmd += _VIDEO_CODEC_ARGS
    cmd += _AUDIO_CODEC_ARGS
    cmd += ['-t', f'{duration:.3f}']
    cmd.append(str(output_path))
    _run(cmd, timeout=SEGMENT_TIMEOUT_S, ctx='video-segment')


def build_mp4(slides: Sequence[SlideInput]) -> RenderResult:
    '''Render ``slides`` (in order) into a single MP4.

    Empty input is a programming error — the caller (the Celery task)
    is responsible for short-circuiting on zero-slide slideshows.
    '''
    if not slides:
        raise MP4RenderError('build_mp4 called with no slides')

    ffmpeg = _require_ffmpeg()

    total_ms = 0
    with tempfile.TemporaryDirectory(prefix='agentclip-mp4-') as work_root:
        work = Path(work_root)
        segment_paths: list[Path] = []

        for idx, slide in enumerate(slides, start=1):
            ext = (
                Path(slide.media_filename).suffix or
                ('.png' if slide.media_kind == 'image' else '.mp4')
            )
            media_path = work / f'slide-{idx:03d}{ext}'
            media_path.write_bytes(slide.media_bytes)

            audio_path: Path | None = None
            if slide.audio_bytes:
                audio_path = work / f'slide-{idx:03d}.mp3'
                audio_path.write_bytes(slide.audio_bytes)

            duration = _segment_duration(
                slide,
                media_path if slide.media_kind == 'video' else None,
            )
            total_ms += int(duration * 1000)

            segment_path = work / f'segment-{idx:03d}.mp4'
            if slide.media_kind == 'video':
                _build_video_segment(
                    ffmpeg=ffmpeg,
                    video_path=media_path,
                    audio_path=audio_path,
                    duration=duration,
                    output_path=segment_path,
                )
            else:
                _build_image_segment(
                    ffmpeg=ffmpeg,
                    image_path=media_path,
                    audio_path=audio_path,
                    duration=duration,
                    output_path=segment_path,
                )
            segment_paths.append(segment_path)

        # Concat demuxer: a text manifest of segment file paths + a
        # codec-copy pass to assemble them. Re-encoding here would
        # double the render time for no quality win since segments
        # are already in the target profile.
        concat_list = work / 'concat.txt'
        # ffmpeg requires absolute or relative-to-cwd paths and
        # demands single-quoted entries with apostrophes escaped.
        concat_list.write_text(
            '\n'.join(f"file '{seg.as_posix()}'" for seg in segment_paths) + '\n',
            encoding='utf-8',
        )
        output_path = work / 'final.mp4'
        _run(
            [
                ffmpeg, '-y',
                '-f', 'concat', '-safe', '0',
                '-i', str(concat_list),
                '-c', 'copy',
                '-movflags', '+faststart',  # web-optimized: moov atom up front
                str(output_path),
            ],
            timeout=CONCAT_TIMEOUT_S,
            ctx='concat',
        )

        mp4_bytes = output_path.read_bytes()

    return RenderResult(
        mp4_bytes=mp4_bytes,
        duration_ms=total_ms,
        segment_count=len(slides),
    )


def extract_poster(slide_image_bytes: bytes) -> bytes:
    '''Build a 1200x630 JPEG poster from a slide image.

    Pillow-only (no ffmpeg). Letterboxes the source onto a black
    canvas so unfurls always look intentional, never cropped.
    Used by the worker as the og:image / twitter:image source.
    '''
    if not slide_image_bytes:
        raise MP4RenderError('extract_poster needs slide image bytes')
    try:
        source = Image.open(io.BytesIO(slide_image_bytes))
        source.load()
    except Exception as exc:  # noqa: BLE001
        raise MP4RenderError(f'could not decode poster source image: {exc}') from exc
    source = source.convert('RGB')

    canvas = Image.new('RGB', (POSTER_WIDTH, POSTER_HEIGHT), color=(0, 0, 0))
    # Fit source inside the canvas preserving aspect ratio.
    scaled = source.copy()
    scaled.thumbnail((POSTER_WIDTH, POSTER_HEIGHT), Image.LANCZOS)
    offset = (
        (POSTER_WIDTH - scaled.width) // 2,
        (POSTER_HEIGHT - scaled.height) // 2,
    )
    canvas.paste(scaled, offset)

    buf = io.BytesIO()
    canvas.save(buf, format='JPEG', quality=88, optimize=True)
    return buf.getvalue()
