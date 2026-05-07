'''Tests for the public lazy-render endpoints.

Covers the 302/202 dance for GET /api/v1/slideshow/<token>/clip.mp4
and clip.pdf — including the rate-limit guard on lazy enqueue.
'''

from __future__ import annotations

import io
from unittest import mock

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from slideshows.models import Slide, Slideshow


def _png_upload() -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new('RGB', (320, 200), 'red').save(buf, format='PNG')
    return SimpleUploadedFile('shot.png', buf.getvalue(), content_type='image/png')


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class LazyMP4EndpointTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create()
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            caption='c',
        )

    def test_returns_302_when_artifact_exists(self) -> None:
        self.slideshow.rendered_mp4.save(
            'clip.mp4', ContentFile(b'fake mp4'), save=True
        )
        response = self.client.get(
            f'/api/v1/slideshow/{self.slideshow.share_token}/clip.mp4'
        )
        self.assertEqual(response.status_code, 302)
        # Redirect target is the FileField's url (R2 public URL in prod).
        self.assertIn('clip', response['Location'])

    def test_returns_202_with_retry_after_when_missing(self) -> None:
        with mock.patch('slideshows.tasks.render_clip_mp4.delay') as delay:
            response = self.client.get(
                f'/api/v1/slideshow/{self.slideshow.share_token}/clip.mp4'
            )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response['Retry-After'], '10')
        self.assertEqual(delay.call_count, 1)

    def test_repeated_miss_within_60s_does_not_re_enqueue(self) -> None:
        with mock.patch('slideshows.tasks.render_clip_mp4.delay') as delay:
            self.client.get(
                f'/api/v1/slideshow/{self.slideshow.share_token}/clip.mp4'
            )
            self.client.get(
                f'/api/v1/slideshow/{self.slideshow.share_token}/clip.mp4'
            )
            self.client.get(
                f'/api/v1/slideshow/{self.slideshow.share_token}/clip.mp4'
            )
        # Only the first call enqueues; subsequent calls return 202
        # without re-queuing.
        self.assertEqual(delay.call_count, 1)

    def test_invalid_token_returns_404(self) -> None:
        response = self.client.get('/api/v1/slideshow/not-a-real-token/clip.mp4')
        self.assertEqual(response.status_code, 404)

    def test_zero_slides_returns_404(self) -> None:
        empty = Slideshow.objects.create()
        response = self.client.get(f'/api/v1/slideshow/{empty.share_token}/clip.mp4')
        self.assertEqual(response.status_code, 404)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class LazyPDFEndpointTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create()
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            caption='c',
        )

    def test_returns_302_when_artifact_exists(self) -> None:
        self.slideshow.rendered_pdf.save(
            'walkthrough.pdf', ContentFile(b'%PDF-1.4 fake'), save=True
        )
        response = self.client.get(
            f'/api/v1/slideshow/{self.slideshow.share_token}/clip.pdf'
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn('walkthrough', response['Location'])

    def test_returns_202_when_missing(self) -> None:
        with mock.patch('slideshows.tasks.render_clip_pdf.delay') as delay:
            response = self.client.get(
                f'/api/v1/slideshow/{self.slideshow.share_token}/clip.pdf'
            )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(delay.call_count, 1)

    def test_invalid_token_returns_404(self) -> None:
        response = self.client.get('/api/v1/slideshow/missing/clip.pdf')
        self.assertEqual(response.status_code, 404)


@override_settings(
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
)
class PublicSerializerArtifactURLTests(TestCase):
    '''SlideshowPublicSerializer surfaces the four artifact URLs.'''

    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()
        self.slideshow = Slideshow.objects.create()
        Slide.objects.create(
            slideshow=self.slideshow,
            position=1,
            media=_png_upload(),
            media_kind='image',
            media_content_type='image/png',
            media_bytes=10,
            caption='c',
        )

    def test_public_response_includes_artifact_urls(self) -> None:
        response = self.client.get(f'/api/v1/slideshow/{self.slideshow.share_token}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        token = self.slideshow.share_token
        self.assertIn('clip_mp4_url', data)
        self.assertIn('clip_pdf_url', data)
        self.assertIn('embed_url', data)
        self.assertIn('poster_image_url', data)
        self.assertTrue(data['clip_mp4_url'].endswith(f'/s/{token}.mp4'))
        self.assertTrue(data['clip_pdf_url'].endswith(f'/s/{token}.pdf'))
        self.assertTrue(data['embed_url'].endswith(f'/embed/{token}'))
        # No poster yet — null is the contract while artifact unrendered.
        self.assertIsNone(data['poster_image_url'])

    def test_poster_url_populated_after_render(self) -> None:
        self.slideshow.poster_image.save(
            'poster.jpg', ContentFile(b'fake jpg'), save=True
        )
        response = self.client.get(f'/api/v1/slideshow/{self.slideshow.share_token}/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()['poster_image_url'])
