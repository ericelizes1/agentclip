'''Tests for the render-version invalidation primitive.

The render pipeline (Units 2-5) leans on a single invariant: every
mutation that affects user-visible content bumps Slideshow.render_version
and clears the rendered_mp4 / rendered_pdf / poster_image FileFields.
These tests pin that invariant from both directions:

1. Direct calls to ``Slideshow.bump_render_version`` increment the
   counter and delete the cached files.
2. Each mutating endpoint triggers the bump on success (via
   ``transaction.on_commit``), and a no-op or rolled-back path does
   not leak a bump.
'''

from __future__ import annotations

import io

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from slideshows.models import Slide, Slideshow


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), 'red').save(buf, format='PNG')
    return buf.getvalue()


def _png_upload(name: str = 'shot.png') -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _png_bytes(), content_type='image/png')


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class BumpRenderVersionTests(TestCase):
    '''Direct tests of the helper, no API surface.'''

    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create()

    def test_increments_counter_from_zero(self) -> None:
        self.assertEqual(self.slideshow.render_version, 0)
        self.slideshow.bump_render_version()
        self.assertEqual(self.slideshow.render_version, 1)

    def test_increments_counter_repeatedly(self) -> None:
        for expected in (1, 2, 3):
            self.slideshow.bump_render_version()
            self.assertEqual(self.slideshow.render_version, expected)

    def test_no_error_when_artifacts_unset(self) -> None:
        # Fresh slideshow has empty FileFields; bump should not error.
        self.slideshow.bump_render_version()
        self.assertEqual(self.slideshow.render_version, 1)
        self.assertFalse(self.slideshow.rendered_mp4)
        self.assertFalse(self.slideshow.rendered_pdf)
        self.assertFalse(self.slideshow.poster_image)

    def test_clears_rendered_files(self) -> None:
        # Stash some content into each render FileField so the bump has
        # something to delete.
        self.slideshow.rendered_mp4.save('clip.mp4', ContentFile(b'fake mp4 bytes'))
        self.slideshow.rendered_pdf.save('walkthrough.pdf', ContentFile(b'%PDF-1.4 fake'))
        self.slideshow.poster_image.save('poster.jpg', ContentFile(b'fake jpg'))
        self.slideshow.refresh_from_db()
        self.assertTrue(self.slideshow.rendered_mp4)
        self.assertTrue(self.slideshow.rendered_pdf)
        self.assertTrue(self.slideshow.poster_image)

        self.slideshow.bump_render_version()

        self.slideshow.refresh_from_db()
        self.assertEqual(self.slideshow.render_version, 1)
        self.assertFalse(self.slideshow.rendered_mp4)
        self.assertFalse(self.slideshow.rendered_pdf)
        self.assertFalse(self.slideshow.poster_image)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class EndpointInvalidationTests(TestCase):
    '''Each mutating endpoint bumps render_version on success.

    Uses APIClient so URL routing, auth, parsers, and decorators
    fire as in production. The TestCase wraps each test in a
    transaction; ``transaction.on_commit`` callbacks run when that
    test transaction commits (which TestCase forces via the
    ``TestCase`` outer-transaction model). For tests that need to
    observe on_commit explicitly, we use captureOnCommitCallbacks.
    '''

    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create()
        self.client = APIClient()

    def _auth(self) -> None:
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.slideshow.write_token}'
        )

    def _edit_auth(self) -> None:
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.slideshow.edit_token}'
        )

    def _refresh(self) -> Slideshow:
        return Slideshow.objects.get(pk=self.slideshow.pk)

    def test_slide_add_bumps(self) -> None:
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                f'/api/slideshow/{self.slideshow.id}/slides/',
                data={'media': _png_upload(), 'caption': 'a'},
                format='multipart',
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self._refresh().render_version, 1)

    def test_slide_update_bumps(self) -> None:
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                f'/api/slideshow/{self.slideshow.id}/slides/',
                data={'media': _png_upload(), 'caption': 'a'},
                format='multipart',
            )
        version_after_add = self._refresh().render_version
        self.assertEqual(version_after_add, 1)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/slides/1/',
                data={'caption': 'b'},
                format='multipart',
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._refresh().render_version, 2)

    def test_slideshow_patch_with_summary_bumps(self) -> None:
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/',
                data={'summary': 'final TL;DR'},
                format='json',
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._refresh().render_version, 1)

    def test_slideshow_patch_with_title_bumps(self) -> None:
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/',
                data={'title': 'New Title'},
                format='json',
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._refresh().render_version, 1)

    def test_slideshow_patch_noop_does_not_bump(self) -> None:
        # PATCH with an empty body or only fields not in the
        # render-affecting set should not bump. The serializer
        # accepts the empty patch as a no-op.
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/slideshow/{self.slideshow.id}/',
                data={},
                format='json',
            )
        self.assertIn(response.status_code, (200, 204))
        self.assertEqual(self._refresh().render_version, 0)

    def test_slide_edit_caption_bumps(self) -> None:
        # Seed a slide via the write_token path first.
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                f'/api/slideshow/{self.slideshow.id}/slides/',
                data={'media': _png_upload(), 'caption': 'original'},
                format='multipart',
            )
        version_after_add = self._refresh().render_version
        self.assertEqual(version_after_add, 1)

        # Now edit via the edit_token (in-browser owner path).
        self._edit_auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/caption/',
                data={'caption': 'edited'},
                format='json',
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._refresh().render_version, 2)

    def test_slide_edit_delete_bumps(self) -> None:
        # Seed two slides so deletion isn't blocked by zero-slide rules.
        self._auth()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                f'/api/slideshow/{self.slideshow.id}/slides/',
                data={'media': _png_upload(), 'caption': 'a'},
                format='multipart',
            )
            self.client.post(
                f'/api/slideshow/{self.slideshow.id}/slides/',
                data={'media': _png_upload(), 'caption': 'b'},
                format='multipart',
            )
        version_after_seed = self._refresh().render_version
        self.assertEqual(version_after_seed, 2)

        self._edit_auth()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(
                f'/api/v1/slideshow/{self.slideshow.share_token}/slides/1/',
            )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self._refresh().render_version, 3)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class RenderPathTests(TestCase):
    '''Versioned R2 storage path produces fresh URLs as the version bumps.'''

    def setUp(self) -> None:
        cache.clear()
        self.slideshow = Slideshow.objects.create()

    def test_render_path_includes_version(self) -> None:
        from slideshows.models import _render_path

        self.assertEqual(self.slideshow.render_version, 0)
        path_v0 = _render_path(self.slideshow, 'clip.mp4')
        self.assertIn('renders/v0/clip.mp4', path_v0)
        self.assertIn(str(self.slideshow.id), path_v0)

        self.slideshow.bump_render_version()
        path_v1 = _render_path(self.slideshow, 'clip.mp4')
        self.assertIn('renders/v1/clip.mp4', path_v1)
        self.assertNotEqual(path_v0, path_v1)
