'''Tests for the Celery render tasks.

Local dev (and tests) run with ``CELERY_TASK_ALWAYS_EAGER=True``, so
calling ``render_clip_mp4.delay(...)`` or ``.apply()`` runs the task
synchronously. We exercise the full code path including FileField
round-tripping through Django's storage backend.

ffmpeg + WeasyPrint must be available locally; tests skip otherwise.
'''

from __future__ import annotations

import io
import shutil
import subprocess
import unittest
from unittest import mock

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from slideshows.models import Slide, Slideshow


def _png_upload() -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new('RGB', (320, 200), 'red').save(buf, format='PNG')
    return SimpleUploadedFile('shot.png', buf.getvalue(), content_type='image/png')


def _mp3_bytes(duration_s: float = 0.4) -> bytes:
    binary = shutil.which('ffmpeg')
    if not binary:
        raise unittest.SkipTest('ffmpeg required')
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3') as fh:
        subprocess.run(
            [
                binary, '-y',
                '-f', 'lavfi',
                '-i', f'sine=frequency=440:duration={duration_s}',
                '-c:a', 'libmp3lame', '-q:a', '7',
                fh.name,
            ],
            capture_output=True, check=True, timeout=15,
        )
        return open(fh.name, 'rb').read()


def _ffmpeg_available() -> bool:
    return bool(shutil.which('ffmpeg'))


def _weasyprint_available() -> bool:
    try:
        from weasyprint import HTML  # noqa: F401
    except (ImportError, OSError):
        return False
    return True


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class RenderClipMP4Tests(TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        if not _ffmpeg_available():
            raise unittest.SkipTest('ffmpeg required')

    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create(title='render-test')

    def _add_slide(self, position: int, audio_bytes: bytes | None = None) -> Slide:
        slide = Slide.objects.create(
            slideshow=self.slideshow,
            position=position,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            caption=f'slide {position}',
        )
        if audio_bytes:
            slide.audio.save('audio.mp3', ContentFile(audio_bytes), save=False)
            slide.audio_voice = 'nova'
            slide.audio_duration_ms = 400
            slide.save()
        return slide

    def test_renders_and_persists_mp4_and_poster(self) -> None:
        from slideshows import tasks
        audio = _mp3_bytes()
        self._add_slide(1, audio_bytes=audio)
        self._add_slide(2, audio_bytes=audio)

        result = tasks.render_clip_mp4(str(self.slideshow.id))

        self.assertEqual(result['status'], 'ok')
        self.slideshow.refresh_from_db()
        self.assertTrue(self.slideshow.rendered_mp4)
        self.assertTrue(self.slideshow.poster_image)
        self.assertGreater(self.slideshow.rendered_mp4.size, 0)
        # MP4 magic bytes vary; just confirm it's non-trivially sized.
        with self.slideshow.rendered_mp4.open('rb') as fh:
            data = fh.read(12)
        self.assertGreater(len(data), 0)

    def test_missing_slideshow_returns_missing(self) -> None:
        from slideshows import tasks
        import uuid
        result = tasks.render_clip_mp4(str(uuid.uuid4()))
        self.assertEqual(result['status'], 'missing')

    def test_no_slides_returns_no_slides(self) -> None:
        from slideshows import tasks
        result = tasks.render_clip_mp4(str(self.slideshow.id))
        self.assertEqual(result['status'], 'no_slides')

    def test_stale_render_discards_output(self) -> None:
        from slideshows import tasks
        audio = _mp3_bytes()
        self._add_slide(1, audio_bytes=audio)
        # Simulate an edit racing the render: bump the version partway
        # through by patching build_mp4 to bump before returning.
        original_build = tasks.build_mp4
        def racing_build(slides):
            r = original_build(slides)
            self.slideshow.bump_render_version()
            return r
        with mock.patch('slideshows.tasks.build_mp4', side_effect=racing_build):
            result = tasks.render_clip_mp4(str(self.slideshow.id))
        self.assertEqual(result['status'], 'stale')
        self.slideshow.refresh_from_db()
        # Stale output should NOT have been persisted.
        self.assertFalse(self.slideshow.rendered_mp4)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
@unittest.skipUnless(_weasyprint_available(), 'weasyprint not installed')
class RenderClipPDFTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create(title='pdf-test', summary='abc')

    def _add_slide(self, position: int) -> Slide:
        return Slide.objects.create(
            slideshow=self.slideshow,
            position=position,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            title=f'Title {position}',
            caption=f'Caption {position}',
        )

    def test_renders_and_persists_pdf(self) -> None:
        from slideshows import tasks
        self._add_slide(1)
        self._add_slide(2)

        result = tasks.render_clip_pdf(str(self.slideshow.id))

        self.assertEqual(result['status'], 'ok')
        self.assertEqual(result['page_count'], 4)  # cover + 2 + end
        self.slideshow.refresh_from_db()
        self.assertTrue(self.slideshow.rendered_pdf)
        with self.slideshow.rendered_pdf.open('rb') as fh:
            head = fh.read(4)
        self.assertEqual(head, b'%PDF')

    def test_missing_slideshow_returns_missing(self) -> None:
        from slideshows import tasks
        import uuid
        result = tasks.render_clip_pdf(str(uuid.uuid4()))
        self.assertEqual(result['status'], 'missing')

    def test_no_slides_returns_no_slides(self) -> None:
        from slideshows import tasks
        result = tasks.render_clip_pdf(str(self.slideshow.id))
        self.assertEqual(result['status'], 'no_slides')


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class PrewarmEnqueueTests(TestCase):
    '''The slideshow PATCH with `summary` should enqueue both render tasks.'''

    def setUp(self) -> None:
        cache.clear()
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create()
        # Seed at least one slide so the renders aren't no-ops.
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            caption='c',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.slideshow.write_token}')

    def test_summary_patch_enqueues_both_renders(self) -> None:
        with mock.patch('slideshows.tasks.render_clip_mp4.delay') as mp4_delay, \
             mock.patch('slideshows.tasks.render_clip_pdf.delay') as pdf_delay, \
             self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/',
                data={'summary': 'final summary'},
                format='json',
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mp4_delay.call_count, 1)
        self.assertEqual(pdf_delay.call_count, 1)
        # Both received the slideshow id.
        self.assertEqual(mp4_delay.call_args.args, (str(self.slideshow.id),))
        self.assertEqual(pdf_delay.call_args.args, (str(self.slideshow.id),))

    def test_title_only_patch_does_not_enqueue(self) -> None:
        with mock.patch('slideshows.tasks.render_clip_mp4.delay') as mp4_delay, \
             mock.patch('slideshows.tasks.render_clip_pdf.delay') as pdf_delay, \
             self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/',
                data={'title': 'New title'},
                format='json',
            )
        self.assertEqual(response.status_code, 200)
        # Title triggers a bump but is NOT the publish signal — no pre-warm.
        self.assertEqual(mp4_delay.call_count, 0)
        self.assertEqual(pdf_delay.call_count, 0)
