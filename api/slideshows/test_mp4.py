'''Tests for the pure MP4 render module.

Synthetic inputs only — no R2, no Django models. Generates tiny PNGs +
MP3s + MP4s at test setup via Pillow and ffmpeg's lavfi source so the
tests run on any developer machine (and in CI) with just ffmpeg
installed.
'''

from __future__ import annotations

import io
import os
import shutil
import subprocess
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from slideshows import mp4


def _png_bytes(size: tuple[int, int] = (320, 200), color: str = 'red') -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', size, color).save(buf, format='PNG')
    return buf.getvalue()


def _mp3_bytes(duration_s: float = 0.5) -> bytes:
    '''Generate a real, tiny, valid MP3 via ffmpeg's lavfi sine source.

    Round-trips through a temp file because ffmpeg-to-stdout-with-mp3
    is fiddly across versions; the temp file is dropped immediately.
    '''
    binary = shutil.which('ffmpeg')
    if not binary:
        raise unittest.SkipTest('ffmpeg required for MP4 module tests')
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as fh:
        path = fh.name
    try:
        subprocess.run(
            [
                binary, '-y',
                '-f', 'lavfi',
                '-i', f'sine=frequency=440:duration={duration_s}',
                '-c:a', 'libmp3lame',
                '-q:a', '7',
                path,
            ],
            capture_output=True,
            check=True,
            timeout=15,
        )
        return Path(path).read_bytes()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _mp4_bytes(duration_s: float = 0.5) -> bytes:
    '''Generate a tiny synthetic MP4 with both video and audio tracks.'''
    binary = shutil.which('ffmpeg')
    if not binary:
        raise unittest.SkipTest('ffmpeg required for MP4 module tests')
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as fh:
        path = fh.name
    try:
        subprocess.run(
            [
                binary, '-y',
                '-f', 'lavfi', '-i', f'color=c=blue:s=320x200:d={duration_s}',
                '-f', 'lavfi', '-i', f'sine=frequency=220:duration={duration_s}',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '64k',
                '-shortest',
                path,
            ],
            capture_output=True,
            check=True,
            timeout=15,
        )
        return Path(path).read_bytes()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _ffprobe_json(mp4_path: Path) -> dict:
    binary = shutil.which('ffprobe')
    if not binary:
        raise unittest.SkipTest('ffprobe required for MP4 module tests')
    import json
    result = subprocess.run(
        [
            binary,
            '-v', 'error',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            str(mp4_path),
        ],
        capture_output=True,
        check=True,
        timeout=15,
    )
    return json.loads(result.stdout.decode('utf-8'))


class BuildMP4Tests(unittest.TestCase):
    def setUp(self) -> None:
        if not shutil.which('ffmpeg'):
            raise unittest.SkipTest('ffmpeg required')

    def _write_and_probe(self, result: mp4.RenderResult) -> dict:
        '''Write the result to a tempfile and ffprobe it.'''
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as fh:
            fh.write(result.mp4_bytes)
            path = Path(fh.name)
        try:
            return _ffprobe_json(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    def test_two_image_slides_with_narration(self) -> None:
        audio = _mp3_bytes(0.5)
        slides = [
            mp4.SlideInput(
                media_bytes=_png_bytes(),
                media_kind='image',
                media_filename='slide1.png',
                audio_bytes=audio,
                audio_duration_ms=500,
            ),
            mp4.SlideInput(
                media_bytes=_png_bytes(color='blue'),
                media_kind='image',
                media_filename='slide2.png',
                audio_bytes=audio,
                audio_duration_ms=500,
            ),
        ]
        result = mp4.build_mp4(slides)

        self.assertGreater(len(result.mp4_bytes), 0)
        self.assertEqual(result.segment_count, 2)
        # Total duration should be roughly the sum of audio durations.
        self.assertEqual(result.duration_ms, 1000)

        probe = self._write_and_probe(result)
        self.assertEqual(probe['format']['format_name'], 'mov,mp4,m4a,3gp,3g2,mj2')

        codecs = {s['codec_type']: s['codec_name'] for s in probe['streams']}
        self.assertEqual(codecs.get('video'), 'h264')
        self.assertEqual(codecs.get('audio'), 'aac')

        # Within ±200ms — concat overhead can pad slightly.
        observed = float(probe['format']['duration'])
        self.assertGreater(observed, 0.7)
        self.assertLess(observed, 1.3)

    def test_silent_slideshow_uses_held_image_default(self) -> None:
        slides = [
            mp4.SlideInput(
                media_bytes=_png_bytes(),
                media_kind='image',
                media_filename='slide1.png',
                audio_bytes=None,
                audio_duration_ms=0,
            ),
        ]
        result = mp4.build_mp4(slides)
        self.assertEqual(result.segment_count, 1)
        # STILL_DURATION_S = 3.0 → 3000ms.
        self.assertEqual(result.duration_ms, 3000)

    def test_single_slide_renders(self) -> None:
        slides = [
            mp4.SlideInput(
                media_bytes=_png_bytes(),
                media_kind='image',
                media_filename='only.png',
                audio_bytes=_mp3_bytes(0.5),
                audio_duration_ms=500,
            ),
        ]
        result = mp4.build_mp4(slides)
        self.assertEqual(result.segment_count, 1)
        probe = self._write_and_probe(result)
        # Single-slide output is still a valid mp4 with both streams.
        types = {s['codec_type'] for s in probe['streams']}
        self.assertIn('video', types)
        self.assertIn('audio', types)

    def test_extreme_aspect_ratio_letterboxed(self) -> None:
        # Tall vertical slide — should letterbox to 1920x1080.
        slides = [
            mp4.SlideInput(
                media_bytes=_png_bytes(size=(100, 800), color='green'),
                media_kind='image',
                media_filename='vertical.png',
                audio_bytes=_mp3_bytes(0.5),
                audio_duration_ms=500,
            ),
        ]
        result = mp4.build_mp4(slides)
        probe = self._write_and_probe(result)
        video_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        self.assertEqual(video_stream['width'], 1920)
        self.assertEqual(video_stream['height'], 1080)

    def test_video_kind_slide(self) -> None:
        slides = [
            mp4.SlideInput(
                media_bytes=_mp4_bytes(0.5),
                media_kind='video',
                media_filename='slide.mp4',
                audio_bytes=_mp3_bytes(0.5),
                audio_duration_ms=500,
            ),
        ]
        result = mp4.build_mp4(slides)
        self.assertEqual(result.segment_count, 1)
        probe = self._write_and_probe(result)
        video_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        self.assertEqual(video_stream['width'], 1920)
        self.assertEqual(video_stream['height'], 1080)

    def test_empty_slides_raises(self) -> None:
        with self.assertRaises(mp4.MP4RenderError):
            mp4.build_mp4([])

    def test_corrupt_media_raises_render_error(self) -> None:
        slides = [
            mp4.SlideInput(
                media_bytes=b'this is not an image',
                media_kind='image',
                media_filename='broken.png',
                audio_bytes=None,
                audio_duration_ms=0,
            ),
        ]
        with self.assertRaises(mp4.MP4RenderError):
            mp4.build_mp4(slides)

    def test_missing_ffmpeg_raises_config_error(self) -> None:
        with mock.patch('slideshows.mp4.shutil.which', return_value=None):
            with self.assertRaises(mp4.MP4RenderConfigError):
                mp4.build_mp4([
                    mp4.SlideInput(
                        media_bytes=_png_bytes(),
                        media_kind='image',
                        media_filename='x.png',
                        audio_bytes=None,
                        audio_duration_ms=0,
                    ),
                ])


class ExtractPosterTests(unittest.TestCase):
    def test_returns_valid_jpeg_at_target_size(self) -> None:
        poster = mp4.extract_poster(_png_bytes(size=(800, 600)))
        self.assertGreater(len(poster), 0)
        img = Image.open(io.BytesIO(poster))
        self.assertEqual(img.size, (mp4.POSTER_WIDTH, mp4.POSTER_HEIGHT))
        self.assertEqual(img.format, 'JPEG')

    def test_letterboxes_unusual_aspect_ratios(self) -> None:
        # Square source onto a 1.91:1 canvas should leave black bars.
        poster = mp4.extract_poster(_png_bytes(size=(400, 400), color='red'))
        img = Image.open(io.BytesIO(poster))
        # Sample a corner pixel — should be black (the letterbox).
        self.assertEqual(img.getpixel((0, 0)), (0, 0, 0))
        # Sample the center — should be the source color.
        cx, cy = img.size[0] // 2, img.size[1] // 2
        r, g, b = img.getpixel((cx, cy))
        self.assertGreater(r, 200)  # red dominates
        self.assertLess(g, 50)
        self.assertLess(b, 50)

    def test_empty_bytes_raises(self) -> None:
        with self.assertRaises(mp4.MP4RenderError):
            mp4.extract_poster(b'')

    def test_corrupt_bytes_raises(self) -> None:
        with self.assertRaises(mp4.MP4RenderError):
            mp4.extract_poster(b'definitely not an image')
